"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface WelcomeScreenProps {
  onConnect: () => void;
  isLoading: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onConnect, isLoading }) => {
  return (
    <motion.div 
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="w-32 h-32 mb-8 relative"
        animate={{ 
          scale: [1, 1.05, 1]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 3,
          ease: "easeInOut"
        }}
      >
        {/* LUKSO Logo SVG */}
        <svg 
          viewBox="0 0 125 125" 
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M62.5,0 C97.0178,0 125,27.9822 125,62.5 C125,97.0178 97.0178,125 62.5,125 C27.9822,125 0,97.0178 0,62.5 C0,27.9822 27.9822,0 62.5,0 Z" 
            fill="#FFF" 
          />
          <path 
            d="M89.5833,42.5926 L89.5833,82.2222 L36.1111,82.2222 L36.1111,42.5926 L89.5833,42.5926 Z M49.537,69.2963 L76.1574,69.2963 L76.1574,55.5185 L49.537,55.5185 L49.537,69.2963 Z" 
            fill="#7B46F6" 
          />
        </svg>
      </motion.div>

      <h1 className="text-4xl font-heading font-bold mb-4 text-primary-600">
        LuksoPoll
      </h1>

      <p className="text-xl mb-8 max-w-md text-primary-800">
        Create decentralized polls, vote, and earn rewards on the LUKSO blockchain.
      </p>

      <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg mb-8 max-w-md">
        <h2 className="font-bold text-lg mb-2">Features:</h2>
        <ul className="text-left text-sm space-y-1">
          <li className="flex items-center">
            <span className="mr-2 text-green-500">✓</span> 
            Easy connection with Universal Profile
          </li>
          <li className="flex items-center">
            <span className="mr-2 text-green-500">✓</span> 
            Polls with LYX or LSP7 token rewards
          </li>
          <li className="flex items-center">
            <span className="mr-2 text-green-500">✓</span> 
            Follower, token, and NFT requirements
          </li>
          <li className="flex items-center">
            <span className="mr-2 text-green-500">✓</span> 
            Earn points for activities
          </li>
        </ul>
      </div>

      <motion.button
        className="btn-primary py-3 px-10 text-lg flex items-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onConnect}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Connecting to Universal Profile...
          </>
        ) : (
          "Connect with Universal Profile"
        )}
      </motion.button>

      <p className="mt-4 text-sm text-primary-800 max-w-md">
        * The LUKSO Browser Extension must be installed to connect. If not installed, you can install it <a href="https://docs.lukso.tech/install-up-browser-extension" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-600">here</a>.
      </p>
    </motion.div>
  );
};

export default WelcomeScreen; 