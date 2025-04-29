import React, { useState } from 'react';

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false); // For showing "typing..." state

  const handleSend = async () => {
    if (input.trim() === '') return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);

    const userInput = input;
    setInput('');
    setLoading(true);

    try {
      const reply = await sendMessage(userInput);
      const botMessage = { sender: 'bot', text: reply || "Sorry, I didn't understand that." };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'Something went wrong. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  async function sendMessage(message) {
    const response = await fetch('http://localhost:4000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      credentials: "include"
    });

    const data = await response.json();
    return data.reply;
  }

  return (
    <div className="max-w-lg mx-auto h-[90vh] flex flex-col border rounded-3xl shadow-xl bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 text-xl font-semibold shadow-md">
        🤖 HealthCare Assistant
      </div>
  
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-gray-50 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="flex items-end space-x-2 max-w-[75%]">
              {msg.sender === 'bot' && (
                <img
                  src="https://i.ibb.co/3pPYd14/bot-avatar.png"
                  alt="Bot"
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div
                className={`px-4 py-3 rounded-2xl text-sm shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white text-gray-800 rounded-bl-none'
                }`}
              >
                {msg.text}
                <div className="text-[10px] text-gray-400 mt-1 text-right">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {msg.sender === 'user' && (
                <img
                  src="https://i.ibb.co/Y3LwSnR/user-avatar.png"
                  alt="User"
                  className="w-8 h-8 rounded-full"
                />
              )}
            </div>
          </div>
        ))}
  
        {loading && (
          <div className="flex items-center space-x-2">
            <img
              src="https://i.ibb.co/3pPYd14/bot-avatar.png"
              alt="Bot"
              className="w-8 h-8 rounded-full"
            />
            <div className="bg-white px-4 py-3 rounded-2xl shadow-md text-sm animate-pulse">
              Typing...
            </div>
          </div>
        )}
      </div>
  
      {/* Input Box */}
      <div className="p-4 bg-white border-t flex items-center gap-3">
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition disabled:opacity-50"
          onClick={handleSend}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
  
};

export default ChatInterface;
