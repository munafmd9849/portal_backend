const EXAM_DEVICE_KEY = 'pwioi_exam_device_id';

export function getExamDeviceId() {
  try {
    let id = localStorage.getItem(EXAM_DEVICE_KEY);
    if (!id) {
      id = `dev_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
      localStorage.setItem(EXAM_DEVICE_KEY, id);
    }
    return id;
  } catch {
    return `dev_fallback_${Date.now()}`;
  }
}

export function getExamDeviceHeaders() {
  return { 'X-Exam-Device-Id': getExamDeviceId() };
}
