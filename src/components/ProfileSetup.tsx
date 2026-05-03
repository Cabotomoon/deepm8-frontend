import { useState } from 'react';
import { checkUsernameAvailable } from '../services/localDataService';
import './ProfileSetup.css';

interface ProfileSetupProps {
  onComplete: (username: string) => void;
  defaultName?: string;
  currentUserId?: string;
}

export default function ProfileSetup({ onComplete, defaultName = '', currentUserId }: ProfileSetupProps) {
  const [username, setUsername] = useState(defaultName);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const validateUsername = (name: string): string | null => {
    if (name.length < 3) {
      return 'El nombre debe tener al menos 3 caracteres';
    }
    if (name.length > 20) {
      return 'El nombre no puede tener más de 20 caracteres';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      return 'Solo letras, números y guion bajo permitidos';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      // Check if username is available
      const isAvailable = await checkUsernameAvailable(username, currentUserId);

      if (!isAvailable) {
        setError(`El nombre "${username}" ya está en uso. Por favor elige otro.`);
        setIsChecking(false);
        return;
      }

      onComplete(username);
    } catch (err) {
      setError('Error al verificar el nombre de usuario');
      setIsChecking(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);
    setError('');
  };

  return (
    <div className="profile-setup-overlay">
      <div className="profile-setup-modal">
        <div className="profile-setup-header">
          <h2>👋 ¡Bienvenido a Chess Clash!</h2>
          <p>Paso 1 de 2: Elige tu nombre de usuario único</p>
        </div>

        <form onSubmit={handleSubmit} className="profile-setup-form">
          <div className="form-group">
            <label htmlFor="username">Nombre de Usuario</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="tu_nombre_aqui"
              maxLength={20}
              autoFocus
              className={error ? 'input-error' : ''}
            />
            {error && <span className="error-message">{error}</span>}
            <span className="input-hint">
              3-20 caracteres, solo letras, números y guion bajo
            </span>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isChecking || username.length < 3}
          >
            {isChecking ? 'Verificando...' : 'Continuar →'}
          </button>
        </form>

        <div className="profile-setup-footer">
          <p>🎯 Tu nombre será visible para otros jugadores</p>
          <p className="warning-text">⚠️ Elige bien, los nombres deben ser únicos</p>
        </div>
      </div>
    </div>
  );
}
