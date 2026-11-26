import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../Toast';
import BottomNav from '../BottomNav';
import UnitsImportCard from '../admin/UnitsImportCard';

vi.mock('../../services/units.service', () => ({
  createUnitsBulk: vi.fn(async (_cid, units) => units.map((u, i) => ({ id: `u${i}`, ...u }))),
}));

describe('BottomNav', () => {
  it('el vecino tiene Expensas a un toque', () => {
    render(<BottomNav currentView="/" onNavigate={() => {}} />);
    expect(screen.getByText('Inicio')).toBeTruthy();
    expect(screen.getByText('Expensas')).toBeTruthy();
    expect(screen.queryByText('Panel')).toBeNull();
  });

  it('el administrador entra directo a su panel', () => {
    const onNavigate = vi.fn();
    render(<BottomNav currentView="/admin" onNavigate={onNavigate} isAdmin />);
    fireEvent.click(screen.getByText('Panel'));
    expect(onNavigate).toHaveBeenCalledWith('/admin');
    expect(screen.queryByText('Inicio')).toBeNull();
  });
});

describe('UnitsImportCard', () => {
  it('previsualiza lo pegado desde Excel y carga solo las filas válidas', async () => {
    const onImported = vi.fn();
    render(
      <ToastProvider>
        <UnitsImportCard consortiumId="c1" existingNames={['1A']} onImported={onImported} />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Cargar muchas unidades de una vez'));
    fireEvent.change(screen.getByLabelText('Filas copiadas desde Excel'), {
      target: { value: 'Unidad\tPiso\tDepto\tCoeficiente\n1A\t1\tA\t10\n1B\t1\tB\t12,5\n2A\t2\tA\t12,5' },
    });
    expect(screen.getByText(/2 unidades listas/)).toBeTruthy();
    expect(screen.getByText(/ya existe/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar 2 unidades' }));
    await vi.waitFor(() => expect(onImported).toHaveBeenCalled());
    expect(onImported.mock.calls[0][0].map(u => u.name)).toEqual(['1B', '2A']);
  });
});
