import { useStore } from '@/store';
import { UnlockPage } from '@/pages/UnlockPage';
import { MainLayout } from '@/components/layout/MainLayout';

export function App() {
  const locked = useStore((s) => s.locked);
  return locked ? <UnlockPage /> : <MainLayout />;
}
