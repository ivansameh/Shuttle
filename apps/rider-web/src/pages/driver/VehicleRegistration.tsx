import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function VehicleRegistration() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  
  const [formData, setFormData] = useState({
    licensePlate: '',
    make: '',
    model: '',
    year: '',
    capacity: '14',
    color: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/driver/vehicle', formData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to register vehicle. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center py-12 animate-slide-up">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Vehicle Registered!</h2>
          <p className="text-muted mb-8 text-sm">
            Your vehicle details have been submitted. An admin will review your profile shortly. 
            Once approved, you will be able to access your driving schedule.
          </p>
          <Button 
            fullWidth
            onClick={() => navigate('/driver/schedule')}
          >
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col p-6 items-center justify-center">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-2xl mb-4 border border-primary-100">
            <Truck className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Register Your Vehicle</h1>
          <p className="text-muted text-sm mt-2">We need your car details before you can start driving.</p>
        </div>

        <Card className="shadow-xl">
          {error && (
            <div className="mb-6 bg-error/5 border border-error/20 p-4 rounded-xl flex items-start gap-3 text-error text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input 
              label="License Plate"
              required
              className="font-mono uppercase" 
              placeholder="ABC-1234"
              value={formData.licensePlate}
              onChange={e => setFormData({...formData, licensePlate: e.target.value})}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Make"
                required
                placeholder="e.g. Toyota"
                value={formData.make}
                onChange={e => setFormData({...formData, make: e.target.value})}
              />
              <Input 
                label="Model"
                required
                placeholder="e.g. Hiace"
                value={formData.model}
                onChange={e => setFormData({...formData, model: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Year"
                type="number"
                placeholder="2024"
                value={formData.year}
                onChange={e => setFormData({...formData, year: e.target.value})}
              />
              <Input 
                label="Capacity"
                required
                type="number"
                placeholder="14"
                value={formData.capacity}
                onChange={e => setFormData({...formData, capacity: e.target.value})}
              />
            </div>

            <Input 
              label="Color"
              placeholder="e.g. White"
              value={formData.color}
              onChange={e => setFormData({...formData, color: e.target.value})}
            />

            <Button 
              type="submit" 
              fullWidth
              isLoading={loading}
              size="lg"
              className="mt-4"
            >
              Register Vehicle
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
