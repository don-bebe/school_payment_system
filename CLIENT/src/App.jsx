import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';
import AppRouter from './routes/AppRouter';
import ToastContainer from './components/feedback/Toast';
import { PageLoader } from './components/feedback/Loading';
import './index.css';

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<PageLoader message="Starting up…" />} persistor={persistor}>
        <AppRouter />
        <ToastContainer />
      </PersistGate>
    </Provider>
  );
}