import { useLocation } from 'react-router-dom';
import Chatbot from './Chatbot';

const PersistentChatbot = () => {
  const location = useLocation();
  
  // Don't show chatbot on admin pages
  if (location.pathname.startsWith('/admin')) {
    return null;
  }
  
  return <Chatbot />;
};

export default PersistentChatbot;