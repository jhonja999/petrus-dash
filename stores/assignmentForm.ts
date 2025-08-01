import { create } from 'zustand';

interface AssignmentFormData {
  truckId: string;
  driverId: string;
  totalLoaded: string;
  fuelType: string;
  customFuelType: string;
  notes: string;
}

interface AssignmentFormState {
  formData: AssignmentFormData;
  setFormData: (data: Partial<AssignmentFormData>) => void;
  resetForm: () => void;
}
const useAssignmentFormStore = create<AssignmentFormState>((set) => ({
  formData: {
    truckId: '',
    driverId: '',
    totalLoaded: '',
    fuelType: '',
    customFuelType: '',
    notes: '',
  },
  setFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  resetForm: () =>
    set({
      formData: {
        truckId: '',
        driverId: '',
        totalLoaded: '',
        fuelType: '',
        customFuelType: '',
        notes: '',
      },
    }),
}));

export default useAssignmentFormStore;

