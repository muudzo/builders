import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="vk-container" style={{ paddingTop: '4rem' }}>
      <EmptyState
        title="Page not found"
        description="That page doesn't exist or you don't have access to it."
        action={
          <Link to="/">
            <Button variant="primary">Go home</Button>
          </Link>
        }
      />
    </div>
  );
}
