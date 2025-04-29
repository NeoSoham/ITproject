import React, { useEffect, useState } from 'react';
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';

const Chatbot = () => {
  const [token, setToken] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    setToken(isLoggedIn === 'true');
  }, []);

  return (
    <div>
      {
        token && (
          <div
            onClick={() => navigate('/chatinterface')}
            className="fixed bottom-4 right-4 z-50 border-2 border-primary rounded-full hidden md:block"
          >
            <img
              className="w-16 h-16 cursor-pointer text-primary fill-primary"
              src={assets.chats_icon}
              alt=""
            />
          </div>
        )
      }

    </div>
  );
};

export default Chatbot;
