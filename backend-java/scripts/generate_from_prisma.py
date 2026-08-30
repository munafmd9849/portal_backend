#!/usr/bin/env python3
"""Generate JPA entities and Spring Data repositories from Prisma schema."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = Path("/home/munafmd9849/Projects/PlacementPortal/PORTAL-MAIN/backend/prisma/schema.prisma")
ENTITY_DIR = ROOT / "src/main/java/com/pwioi/portal/entity"
REPO_DIR = ROOT / "src/main/java/com/pwioi/portal/repository"

TYPE_MAP = {
    "String": "String",
    "Boolean": "Boolean",
    "Int": "Integer",
    "Float": "Double",
    "Decimal": "java.math.BigDecimal",
    "DateTime": "java.time.Instant",
}

JAVA_KEYWORDS = {"order", "default", "class", "interface", "package", "long", "float", "double", "int"}


def java_field(name: str) -> str:
    if name in JAVA_KEYWORDS:
        return name + "Value"
    return name


def extract_models(text: str) -> list[tuple[str, str]]:
    """Extract model name + body using brace depth so comments with } do not truncate."""
    out = []
    i = 0
    while True:
        m = re.search(r"model\s+(\w+)\s*\{", text[i:])
        if not m:
            break
        name = m.group(1)
        start = i + m.end()
        depth = 1
        j = start
        while j < len(text) and depth:
            if text[j] == "{":
                depth += 1
            elif text[j] == "}":
                depth -= 1
            j += 1
        out.append((name, text[start : j - 1]))
        i = j
    return out


def parse_schema(text: str) -> list[dict]:
    models = []
    for name, body in extract_models(text):
        table = name
        tm = re.search(r'@@map\("([^"]+)"\)', body)
        if tm:
            table = tm.group(1)
        fields = []
        uniques = []
        for line in body.splitlines():
            line = line.strip()
            if not line or line.startswith("//") or line.startswith("///") or line.startswith("@@"):
                if line.startswith("@@unique"):
                    cols = re.findall(r"\w+", line.split("[", 1)[-1].split("]", 1)[0])
                    uniques.append(cols)
                continue
            # skip relation-only lines that are arrays or model types without scalar annotation
            parts = line.split()
            if len(parts) < 2:
                continue
            fname, ftype = parts[0], parts[1]
            is_array = ftype.endswith("[]")
            base = ftype.replace("?", "").replace("[]", "")
            optional = "?" in ftype
            if is_array:
                # OneToMany collection — skip scalar generation
                continue
            if base not in TYPE_MAP:
                # relation object field
                rel = re.search(r"@relation\(fields:\s*\[(\w+)\]", line)
                if rel:
                    continue  # FK already present as scalar
                continue
            col_map = re.search(r'@map\("([^"]+)"\)', line)
            col = col_map.group(1) if col_map else fname
            unique = "@unique" in line
            default_uuid = "@default(uuid())" in line
            is_id = "@id" in line
            default_now = "@default(now())" in line
            updated_at = "@updatedAt" in line
            default_val = None
            dm = re.search(r"@default\(([^)]+)\)", line)
            if dm and not default_uuid and not default_now:
                default_val = dm.group(1)
            fields.append(
                {
                    "name": fname,
                    "java": java_field(fname),
                    "type": TYPE_MAP[base],
                    "optional": optional,
                    "column": col,
                    "unique": unique,
                    "id": is_id,
                    "default_uuid": default_uuid,
                    "default_now": default_now,
                    "updated_at": updated_at,
                    "default_val": default_val,
                }
            )
        models.append({"name": name, "table": table, "fields": fields, "uniques": uniques})
    return models


def entity_java(model: dict) -> str:
    name = model["name"]
    imports = {
        "jakarta.persistence.*",
        "org.hibernate.annotations.CreationTimestamp",
        "org.hibernate.annotations.UpdateTimestamp",
        "com.fasterxml.jackson.annotation.JsonIgnoreProperties",
        "java.util.UUID",
    }
    has_instant = any(f["type"] == "java.time.Instant" for f in model["fields"])
    has_bd = any(f["type"] == "java.math.BigDecimal" for f in model["fields"])
    if has_instant:
        imports.add("java.time.Instant")
    if has_bd:
        imports.add("java.math.BigDecimal")

    lines = [
        "package com.pwioi.portal.entity;",
        "",
        *[f"import {i};" for i in sorted(imports)],
        "",
        "@Entity",
        f'@Table(name = "{model["table"]}")',
        "@JsonIgnoreProperties({\"hibernateLazyInitializer\", \"handler\"})",
        f"public class {name} {{",
        "",
    ]

    for f in model["fields"]:
        anns = []
        if f["id"]:
            anns.append("    @Id")
        col_parts = [f'name = "{f["column"]}"']
        if not f["optional"] and not f["id"] and not f["default_now"] and not f["updated_at"] and f["default_val"] is None:
            # keep nullable=true for safety with existing data; required fields still work
            pass
        if f["unique"] and not f["id"]:
            col_parts.append("unique = true")
        if f["type"] == "String" and f["column"] in ("description", "body", "message", "instructions", "requirements",
                                                     "config", "responses", "snapshot", "previewData", "errorReport",
                                                     "analysisJson", "feedbackJson", "rawJson", "endorsementsData"):
            col_parts.append("columnDefinition = \"TEXT\"")
        anns.append(f'    @Column({", ".join(col_parts)})')
        if f["default_now"] and not f["updated_at"]:
            anns.append("    @CreationTimestamp")
        if f["updated_at"]:
            anns.append("    @UpdateTimestamp")
        jtype = f["type"].split(".")[-1]
        lines.extend(anns)
        lines.append(f"    private {jtype} {f['java']};")
        lines.append("")

    # getters/setters
    for f in model["fields"]:
        jtype = f["type"].split(".")[-1]
        cap = f["java"][0].upper() + f["java"][1:]
        getter = "is" + cap if jtype == "Boolean" and f["java"].startswith("is") else "get" + cap
        if jtype == "Boolean" and not f["java"].startswith("is"):
            getter = "get" + cap
        lines.append(f"    public {jtype} {getter}() {{ return {f['java']}; }}")
        lines.append(f"    public void set{cap}({jtype} {f['java']}) {{ this.{f['java']} = {f['java']}; }}")
        lines.append("")

    lines.append("    @PrePersist")
    lines.append("    public void prePersist() {")
    id_field = next((f for f in model["fields"] if f["id"]), None)
    if id_field:
        lines.append(f"        if (this.{id_field['java']} == null || this.{id_field['java']}.isBlank()) {{")
        lines.append(f"            this.{id_field['java']} = UUID.randomUUID().toString();")
        lines.append("        }")
    lines.append("    }")
    lines.append("}")
    lines.append("")
    return "\n".join(lines)


def repo_java(model: dict) -> str:
    name = model["name"]
    methods = []
    for f in model["fields"]:
        if f["unique"] and not f["id"]:
            cap = f["java"][0].upper() + f["java"][1:]
            jtype = f["type"].split(".")[-1]
            methods.append(f"    java.util.Optional<{name}> findBy{cap}({jtype} {f['java']});")
            methods.append(f"    boolean existsBy{cap}({jtype} {f['java']});")
    # composite uniques
    for cols in model["uniques"]:
        if not cols:
            continue
        parts = []
        args = []
        for c in cols:
            field = next((x for x in model["fields"] if x["name"] == c), None)
            if not field:
                continue
            cap = field["java"][0].upper() + field["java"][1:]
            parts.append(cap)
            jtype = field["type"].split(".")[-1]
            args.append(f"{jtype} {field['java']}")
        if parts:
            methods.append(
                f"    java.util.Optional<{name}> findBy{'And'.join(parts)}({', '.join(args)});"
            )
    # common FK list finders (skip unique fields — those already have Optional findBy)
    fk_names = {
        "userId", "studentId", "jobId", "companyId", "recruiterId", "assessmentId",
        "sessionId", "applicationId", "roundId", "driveId", "interviewId", "enrollmentId",
        "questionId", "tokenId", "violationId", "batchId", "schoolId", "centerId",
        "linkedAssessmentId", "createdById", "uploadedById", "updatedById",
    }
    for f in model["fields"]:
        if f["unique"] or f["id"] or f["type"] != "String":
            continue
        if f["name"] not in fk_names:
            continue
        cap = f["java"][0].upper() + f["java"][1:]
        methods.append(f"    java.util.List<{name}> findBy{cap}(String {f['java']});")

    body = "\n".join(methods)
    return f"""package com.pwioi.portal.repository;

import com.pwioi.portal.entity.{name};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface {name}Repository extends JpaRepository<{name}, String>, JpaSpecificationExecutor<{name}> {{
{body}
}}
"""


def main():
    text = SCHEMA.read_text()
    models = parse_schema(text)
    ENTITY_DIR.mkdir(parents=True, exist_ok=True)
    REPO_DIR.mkdir(parents=True, exist_ok=True)
    for model in models:
        (ENTITY_DIR / f"{model['name']}.java").write_text(entity_java(model))
        (REPO_DIR / f"{model['name']}Repository.java").write_text(repo_java(model))
    print(f"Generated {len(models)} entities and repositories")
    print(", ".join(m["name"] for m in models))


if __name__ == "__main__":
    main()
