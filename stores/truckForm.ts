import { create } from 'zustand';

interface TruckFormData {
  placa: string;
  typefuel: string;
  capacitygal: string;
  lastRemaining: string;
  state: string;
}

interface TruckFormState {
  formData: TruckFormData;
  setFormData: (data: Partial<TruckFormData>) => void;
  resetForm: () => void;
}

const useTruckFormStore = create<TruckFormState>((set) => ({
  formData: {
    placa: '',
    typefuel: '',
    capacitygal: '',
    lastRemaining: '0',
    state: 'Activo',
  },
  setFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  resetForm: () =>
    set({
      formData: {
        placa: '',
        typefuel: '',
        capacitygal: '',
        lastRemaining: '0',
        state: 'Activo',
      },
    }),
}));

export default useTruckFormStore;

