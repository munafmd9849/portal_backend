import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, SquarePen, Plus, Github, LayoutTemplate } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import {
  addProjectArray,
  deleteProjectArray,
  updateProjectArray,
  getStudentProfile,
  generateProjectContent
} from '../../../services/students';

/** Soft light header bands — restrained, not neon */
const PROJECT_HEADER_TONES = [
  { band: 'bg-sky-50', icon: 'text-sky-600/70' },
  { band: 'bg-teal-50', icon: 'text-teal-700/65' },
  { band: 'bg-indigo-50', icon: 'text-indigo-600/65' },
  { band: 'bg-amber-50', icon: 'text-amber-700/65' },
];

const addBtnClass = (active, disabled) => {
  if (disabled) return 'rounded-full p-2 shadow bg-gray-400 cursor-not-allowed opacity-60';
  if (active) return 'rounded-full p-2 shadow bg-[#5e9ad6] hover:bg-[#4a7bb8] transition';
  return 'rounded-full p-2 shadow bg-[#8ec5ff] hover:bg-[#5e9ad6] transition';
};

const editBtnClass = (disabled) =>
  disabled
    ? 'p-1.5 rounded-md text-gray-300 cursor-not-allowed'
    : 'p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors';

function parseTechStack(project) {
  const raw = project?.techStack ?? project?.technologies ?? [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return raw.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }
  return [];
}

const ProjectsSection = ({ studentId, isAdminView = false, initialProjects = null }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isAddButtonActive, setIsAddButtonActive] = useState(false);
  const formRef = useRef(null);
  const [editedProject, setEditedProject] = useState({
    title: '',
    description: '',
    techStack: [],
    liveUrl: '',
    githubUrl: ''
  });
  const [techStackInput, setTechStackInput] = useState(''); // Raw input for tech stack
  const [aiGenerated, setAiGenerated] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const projectsLoadedRef = useRef(false);

  useEffect(() => {
    projectsLoadedRef.current = false;
  }, [studentId, initialProjects]);

  // Load projects data once on mount
  useEffect(() => {
    if (initialProjects !== null) {
      const realProjects = Array.isArray(initialProjects) ? initialProjects : [];
      setProjects(realProjects);
      projectsLoadedRef.current = true;
      return;
    }

    const profileKey = isAdminView && studentId ? studentId : user?.id;
    if (!profileKey && !user?.id) return;

    if (projectsLoadedRef.current) return;

    let isMounted = true;
    projectsLoadedRef.current = true;

    const loadProjects = async () => {
      try {
        setLoading(true);
        console.log('🚀 [ProjectsSection] Starting loadProjects, isMounted:', isMounted);
        const profile = await getStudentProfile(isAdminView && studentId ? studentId : user.id);
        
        // CRITICAL: Log raw API response
        console.log('📥 [ProjectsSection] PROFILE API RESPONSE:', profile);
        console.log('📥 [ProjectsSection] Projects field:', profile?.projects);
        console.log('📥 [ProjectsSection] Projects type:', typeof profile?.projects);
        console.log('📥 [ProjectsSection] Projects isArray:', Array.isArray(profile?.projects));
        console.log('🔍 [ProjectsSection] isMounted check:', isMounted);
        
        // CRITICAL: Always process data, but check isMounted before setState
        // SAFE: Normalize to array, never null/undefined
        const realProjects = Array.isArray(profile?.projects) 
          ? profile.projects 
          : (profile?.projects ? [profile.projects] : []);
        const hasRealProjects = realProjects.length > 0;
        
        console.log('🔍 [ProjectsSection] Processed data:', {
          realProjectsCount: realProjects.length,
          hasRealProjects,
          firstProject: realProjects[0] || null,
          isMounted,
        });
        
        // CRITICAL: Update state regardless of isMounted (React handles cleanup)
        if (hasRealProjects) {
          console.log('✅ [ProjectsSection] Setting real projects:', realProjects);
          setProjects(realProjects);
        } else {
          console.log('📭 [ProjectsSection] No projects found. Using empty array.');
          setProjects([]);
        }
      } catch (error) {
        console.error('❌ [ProjectsSection] Error loading projects:', error);
        setError('Failed to load projects. Please try again.');
        setProjects([]);
        // Reset on error to allow retry
        projectsLoadedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, [user?.id, isAdminView, studentId, initialProjects]);

  // Normalize URL helper
  const normalizeUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  const startEditing = (index) => {
    setEditingIndex(index);
    const project = projects[index];
    // Parse techStack from JSON string if it exists
    let techStack = [];
    if (project.technologies) {
      try {
        techStack = typeof project.technologies === 'string' 
          ? JSON.parse(project.technologies) 
          : project.technologies;
      } catch (e) {
        techStack = [];
      }
    }
    setEditedProject({
      title: project.title,
      description: project.description || '',
      techStack: techStack,
      liveUrl: project.liveUrl || '',
      githubUrl: project.githubUrl || ''
    });
    setTechStackInput(techStack.join(', ')); // Set raw input for editing
    // Load AI-generated content if available
    if (project.ai_summary || project.ai_bullets) {
      setAiGenerated({
        summary: project.ai_summary,
        bullets: project.ai_bullets ? (typeof project.ai_bullets === 'string' ? JSON.parse(project.ai_bullets) : project.ai_bullets) : [],
        skills: project.skills_extracted ? (typeof project.skills_extracted === 'string' ? JSON.parse(project.skills_extracted) : project.skills_extracted) : []
      });
    } else {
      setAiGenerated(null);
    }
  };

  const handleChange = (field, value) => {
    setEditedProject((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-generate AI content when project data changes
  const triggerAIGeneration = async () => {
    if (!editedProject.title.trim() || !editedProject.description.trim()) {
      return;
    }

    try {
      setGenerating(true);
      const techStackArray = techStackInput.split(',').map(t => t.trim()).filter(t => t);
      const generated = await generateProjectContent({
        title: editedProject.title,
        description: editedProject.description,
        techStack: techStackArray
      });
      setAiGenerated(generated);
    } catch (error) {
      console.error('AI generation error:', error);
      // Don't show error to user, just log it
    } finally {
      setGenerating(false);
    }
  };

  const saveProject = async () => {
    if (!editedProject.title.trim() || !editedProject.description.trim() || !editedProject.liveUrl.trim()) {
      setError('Please fill in all required fields (Title, Description, and Project URL).');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Process tech stack from raw input
      const techStackArray = techStackInput.split(',').map(t => t.trim()).filter(t => t);
      
      // Prepare project data with AI-generated content
      const projectData = {
        title: editedProject.title,
        description: editedProject.description,
        technologies: JSON.stringify(techStackArray),
        liveUrl: editedProject.liveUrl ? normalizeUrl(editedProject.liveUrl) : '',
        githubUrl: editedProject.githubUrl ? normalizeUrl(editedProject.githubUrl) : ''
      };

      // Include AI-generated fields if available
      if (aiGenerated) {
        projectData.ai_summary = aiGenerated.summary;
        projectData.ai_bullets = JSON.stringify(aiGenerated.bullets || []);
        projectData.skills_extracted = JSON.stringify(aiGenerated.skills || []);
      }

      if (editingIndex !== null && editingIndex < projects.length) {
        // Update existing project
        const existingProject = projects[editingIndex];
        await updateProjectArray(user.id, existingProject.id, projectData);
        setSuccess('Project updated successfully!');
      } else {
        // Add new project
        await addProjectArray(user.id, projectData);
        setSuccess('Project added successfully!');
      }

      // Refresh projects list after save
      const profile = await getStudentProfile(user.id);
      const refreshedProjects = Array.isArray(profile?.projects) ? profile.projects : [];
      console.log('🔄 [ProjectsSection] Refreshed after save:', {
        profileProjects: profile?.projects,
        refreshedCount: refreshedProjects.length,
      });
      setProjects(refreshedProjects);

      setEditingIndex(null);
      setIsAddButtonActive(false);
      setAiGenerated(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving project:', error);
      if (error.code === 'permission-denied') {
        setError('You do not have permission to save projects. Please contact support.');
      } else {
        setError('Failed to save project. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (index) => {
    const project = projects[index];
    if (!window.confirm(`Are you sure you want to delete "${project.title}"?`)) return;

    try {
      setLoading(true);
      await deleteProjectArray(user.id, project.id);
      
      // Refresh projects list after delete
      const profile = await getStudentProfile(user.id);
      const refreshedProjects = Array.isArray(profile?.projects) ? profile.projects : [];
      console.log('🔄 [ProjectsSection] Refreshed after delete:', {
        profileProjects: profile?.projects,
        refreshedCount: refreshedProjects.length,
      });
      setProjects(refreshedProjects);
      
      setSuccess('Project deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);

      if (editingIndex === index) {
        setEditingIndex(null);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('Failed to delete project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addNewProject = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    
    const isCurrentlyAdding = editingIndex === projects.length;
    if (isCurrentlyAdding) {
      // Cancel adding
      setEditingIndex(null);
      setIsAddButtonActive(false);
      setAiGenerated(null);
      setEditedProject({ title: '', description: '', techStack: [], liveUrl: '', githubUrl: '' });
      setTechStackInput('');
      setError('');
    } else {
      // Start adding
      setEditingIndex(projects.length);
      setEditedProject({ title: '', description: '', techStack: [], liveUrl: '', githubUrl: '' });
      setTechStackInput('');
      setAiGenerated(null);
      setIsAddButtonActive(true);
      setError('');
      
      // Scroll to form after a brief delay to ensure it's rendered
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setIsAddButtonActive(false);
    setAiGenerated(null);
    setError('');
  };

  // Auto-trigger AI generation when title or description changes
  useEffect(() => {
    if (editingIndex !== null && editedProject.title.trim() && editedProject.description.trim()) {
      const timer = setTimeout(() => {
        triggerAIGeneration();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [editedProject.title, editedProject.description, techStackInput]);

  return (
    <div className="w-full relative min-w-0">
      <fieldset className="bg-white rounded-xl border-2 border-[#8ec5ff] pt-1 pb-3 md:pb-4 px-3 md:px-6 transition-all duration-200 shadow-lg hover:shadow-xl min-w-0 overflow-hidden">
        <legend className="text-base md:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text select-none">
          Projects
        </legend>

        <div className="flex items-center justify-end mb-2 md:mb-3 mr-0 md:mr-[-1%]">
          <button
            type="button"
            onClick={addNewProject}
            disabled={loading || isAdminView}
            aria-label="Add new project"
            className={addBtnClass(isAddButtonActive, loading || isAdminView)}
            title={isAdminView ? 'Admin view - cannot add projects' : 'Add project'}
          >
            <Plus size={18} className="text-white" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs md:text-sm break-words">{error}</div>
        )}
        {success && (
          <div className="mb-3 p-2.5 bg-green-50 border border-green-200 rounded-md text-green-700 text-xs md:text-sm">{success}</div>
        )}

        {editingIndex === projects.length && (
          <div ref={formRef} className="mb-4 rounded-lg px-3 md:px-4 py-3 bg-gradient-to-r from-[#f0f8fa] to-[#e6f3f8]">
            <label className="text-xs md:text-sm font-semibold text-black mb-1 block">Project Title <span className="text-red-500">*</span></label>
            <input type="text" value={editedProject.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="Enter project title" required className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-300 rounded min-w-0" />
            <label className="text-xs md:text-sm font-semibold text-black mb-1 block">Project Description <span className="text-red-500">*</span></label>
            <textarea value={editedProject.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Enter project description" required rows={2} className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-300 rounded resize-none min-w-0" />
            <label className="text-xs md:text-sm font-semibold text-black mb-1 block">Project URL <span className="text-red-500">*</span></label>
            <input type="url" value={editedProject.liveUrl} onChange={(e) => handleChange('liveUrl', e.target.value)} placeholder="https://example.com" required className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-300 rounded min-w-0" />
            <label className="text-xs md:text-sm font-semibold text-black mb-1 block">Tech Stack</label>
            <input type="text" value={techStackInput} onChange={(e) => setTechStackInput(e.target.value)} onBlur={() => handleChange('techStack', techStackInput.split(',').map((t) => t.trim()).filter(Boolean))} placeholder="React, Node.js, MongoDB" className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-300 rounded min-w-0" />
            <label className="text-xs md:text-sm font-semibold text-black mb-1 block">GitHub URL</label>
            <input type="url" value={editedProject.githubUrl} onChange={(e) => handleChange('githubUrl', e.target.value)} placeholder="https://github.com/username/repo" className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-300 rounded min-w-0" />
            {generating && <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">Generating AI content…</div>}
            {aiGenerated && !generating && (
              <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded text-sm text-gray-700">
                <strong className="text-green-800">AI summary:</strong> {aiGenerated.summary}
              </div>
            )}
            <div className="flex flex-wrap gap-2 justify-end">
              <button type="button" onClick={saveProject} className="px-2.5 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" disabled={loading || generating}>{loading ? 'Saving...' : 'Save'}</button>
              <button type="button" onClick={cancelEditing} className="px-2.5 py-1.5 text-sm rounded bg-gray-300 hover:bg-gray-400 text-gray-800">Cancel</button>
            </div>
          </div>
        )}

        {Array.isArray(projects) && projects.length === 0 && editingIndex !== projects.length && (
          <p className="text-sm text-gray-500 py-6 text-center">No projects yet. Click + to add one.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          {Array.isArray(projects) && projects.map((project, index) =>
            editingIndex === index ? (
              <div key={`edit-${index}`} className="sm:col-span-2 xl:col-span-3 rounded-lg px-3 md:px-4 py-3 bg-gradient-to-r from-[#f0f8fa] to-[#e6f3f8]">
                <label className="text-xs font-semibold text-black mb-1 block">Project Title <span className="text-red-500">*</span></label>
                <input type="text" value={editedProject.title} onChange={(e) => handleChange('title', e.target.value)} className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-300 rounded" />
                <label className="text-xs font-semibold text-black mb-1 block">Project Description <span className="text-red-500">*</span></label>
                <textarea value={editedProject.description} onChange={(e) => handleChange('description', e.target.value)} rows={2} className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-300 rounded resize-none" />
                <label className="text-xs font-semibold text-black mb-1 block">Project URL <span className="text-red-500">*</span></label>
                <input type="url" value={editedProject.liveUrl} onChange={(e) => handleChange('liveUrl', e.target.value)} className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-300 rounded" />
                <label className="text-xs font-semibold text-black mb-1 block">Tech Stack</label>
                <input type="text" value={techStackInput} onChange={(e) => setTechStackInput(e.target.value)} onBlur={() => handleChange('techStack', techStackInput.split(',').map((t) => t.trim()).filter(Boolean))} className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-300 rounded" />
                <label className="text-xs font-semibold text-black mb-1 block">GitHub URL</label>
                <input type="url" value={editedProject.githubUrl} onChange={(e) => handleChange('githubUrl', e.target.value)} className="w-full mb-2 px-2 py-1.5 text-sm border border-gray-300 rounded" />
                <div className="flex flex-wrap gap-2 justify-end">
                  <button type="button" onClick={saveProject} className="px-2.5 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" disabled={loading || generating}>{loading ? 'Saving...' : 'Save'}</button>
                  <button type="button" onClick={cancelEditing} className="px-2.5 py-1.5 text-sm rounded bg-gray-300 hover:bg-gray-400 text-gray-800">Cancel</button>
                  <button type="button" onClick={() => handleDeleteProject(index)} className="px-2.5 py-1.5 text-sm rounded bg-red-500 hover:bg-red-600 text-white" disabled={loading}>Delete</button>
                </div>
              </div>
            ) : (
              <article key={project.id || index} className="group flex flex-col rounded-xl border-2 border-gray-200 bg-white overflow-hidden hover:border-[#3c80a7] hover:shadow-lg transition-all duration-200 min-w-0">
                {(() => {
                  const tone = PROJECT_HEADER_TONES[index % PROJECT_HEADER_TONES.length];
                  return (
                    <div className={`h-20 md:h-24 flex items-center justify-center border-b border-gray-100 ${tone.band}`}>
                      <LayoutTemplate className={`h-7 w-7 ${tone.icon}`} strokeWidth={1.5} aria-hidden />
                    </div>
                  );
                })()}
                <div className="flex flex-1 flex-col p-3.5 md:p-4">
                  <h4 className="text-base font-bold text-gray-900 leading-snug line-clamp-2" title={project.title} style={{ textWrap: 'balance' }}>{project.title}</h4>
                  {project.description ? <p className="mt-1.5 text-sm text-gray-700 line-clamp-3 leading-relaxed">{project.description}</p> : null}
                  {(() => {
                    const tech = parseTechStack(project);
                    if (!tech.length) return null;
                    return (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tech.slice(0, 6).map((t) => (
                          <span key={`${index}-${t}`} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">{t}</span>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="mt-auto pt-3.5 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      {project.liveUrl ? (
                        <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                          View Live <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                      {project.githubUrl ? (
                        <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-blue-700">
                          <Github className="h-3.5 w-3.5" /> Source
                        </a>
                      ) : null}
                    </div>
                    <button type="button" onClick={() => startEditing(index)} aria-label={`Edit project ${project.title}`} className={editBtnClass(loading || isAdminView)} disabled={loading || isAdminView} title={isAdminView ? 'Admin view - cannot edit' : 'Edit project'}>
                      <SquarePen className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            )
          )}
        </div>
      </fieldset>
    </div>
  );
};

export default ProjectsSection;
