import { create } from 'zustand'

export interface GenerateTask {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  result: string[] | null
  prompt: string
}

interface GenerateState {
  activeTab: 'image' | 'video' | 'chat'
  tasks: GenerateTask[]
  currentTask: GenerateTask | null
  setActiveTab: (tab: 'image' | 'video' | 'chat') => void
  addTask: (task: GenerateTask) => void
  updateTask: (taskId: string, updates: Partial<GenerateTask>) => void
  setCurrentTask: (task: GenerateTask | null) => void
}

export const useGenerateStore = create<GenerateState>((set) => ({
  activeTab: 'image',
  tasks: [],
  currentTask: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.taskId === taskId ? { ...t, ...updates } : t)),
      currentTask:
        state.currentTask?.taskId === taskId ? { ...state.currentTask, ...updates } : state.currentTask,
    })),
  setCurrentTask: (task) => set({ currentTask: task }),
}))
