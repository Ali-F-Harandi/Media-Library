import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FaDesktop, FaFolderOpen, FaFileCode, FaGamepad } from 'react-icons/fa';

// Supported file extensions for different Pokémon generations
const SUPPORTED_EXTENSIONS = [
  // Gen 1-2 (Game Boy)
  '.sav', '.gci', '.dat',
  // Gen 3 (GBA)
  '.sav', '.gci',
  // Gen 4-5 (DS)
  '.sav', '.dsv',
  // Gen 6-7 (3DS)
  '.sav', '.dat', '.bin',
  // Gen 8-9 (Switch)
  '.sav', '.bin'
];

const PcLanding = ({ onFileLoad }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = (file) => {
    if (!file) return;
    
    // Validate file extension
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    const isValidExtension = SUPPORTED_EXTENSIONS.includes(fileExtension);
    
    if (!isValidExtension) {
      setError(`Unsupported file type: ${fileExtension}. Please upload a valid Pokémon save file (.sav, .gci, .dat, .bin, .dsv)`);
      console.warn("File extension not supported:", fileExtension);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        onFileLoad(buffer, file.name);
        setError(null);
      } catch (err) {
        setError("Failed to parse file. Please ensure it is a valid save file.");
        console.error(err);
      }
    };
    reader.onerror = () => {
      setError("Error reading file.");
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [onFileLoad]);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sav,.gci,.dat,.bin,.dsv';
    input.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    };
    input.click();
  };

  return (
    <div 
      className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#4ade80 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
      </div>

      <div className="z-10 text-center max-w-2xl w-full">
        <h1 className="text-4xl md:text-5xl font-bold text-green-400 mb-2 font-mono tracking-tighter drop-shadow-lg">
          BILKO'S PC
        </h1>
        <p className="text-gray-400 mb-12 font-mono text-sm">
          SAVE DATA MANAGEMENT SYSTEM v1.0
        </p>

        {/* The PC Visual */}
        <div 
          onClick={handleClick}
          className={`
            relative group cursor-pointer transition-all duration-300 transform
            ${isDragging ? 'scale-105 ring-4 ring-green-400' : 'hover:scale-105'}
          `}
        >
          {/* Monitor Bezel */}
          <div className="bg-gray-800 p-4 rounded-xl shadow-2xl border-b-4 border-r-4 border-gray-700 relative">
            
            {/* Screen Glow Effect */}
            <div className={`absolute inset-0 bg-green-500 opacity-0 transition-opacity duration-500 rounded-xl blur-xl ${isDragging ? 'opacity-20' : 'group-hover:opacity-10'}`}></div>

            {/* Screen Area */}
            <div className="bg-black aspect-video rounded-lg border-2 border-gray-600 relative overflow-hidden flex flex-col items-center justify-center p-8">
              
              {/* CRT Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none z-20 opacity-10" 
                   style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }}>
              </div>

              {/* Content inside Screen */}
              <div className="z-10 text-center">
                <FaGamepad className="text-6xl text-green-500 mx-auto mb-4 animate-pulse" />
                
                {isDragging ? (
                  <div className="space-y-2">
                    <FaFolderOpen className="text-4xl text-green-300 mx-auto" />
                    <p className="text-green-400 font-mono font-bold animate-bounce">DROP FILE HERE</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-green-500 font-mono text-lg blink-cursor">INSERT SAVE DISK</p>
                    <p className="text-gray-500 font-mono text-xs mt-4">Click PC or Drag & Drop</p>
                    <p className="text-gray-600 font-mono text-[10px] mt-2">Supports Gen 1-9 (.sav, .gci, .dat, .bin, .dsv)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Brand/Logo on Bezel */}
            <div className="flex justify-between items-center mt-3 px-2">
              <span className="text-gray-500 text-xs font-bold tracking-widest">RETRO-TECH</span>
              <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-red-900"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-900"></div>
                <div className="w-2 h-2 rounded-full bg-green-900 group-hover:bg-green-500 transition-colors"></div>
              </div>
            </div>
          </div>

          {/* PC Tower/Base (Decorative) */}
          <div className="mt-4 flex justify-center">
             <div className="w-32 h-4 bg-gray-700 rounded-full blur-sm"></div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-8 p-4 bg-red-900/50 border border-red-500 rounded text-red-200 font-mono text-sm animate-fade-in">
            <FaFileCode className="inline mr-2" />
            {error}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-500 text-xs font-mono">
          <div className="p-4 border border-gray-800 rounded bg-gray-900/50">
            <strong className="text-gray-300 block mb-1">STEP 1</strong>
            Click the monitor or drag your save file (.sav, .gci, .dat, .bin, .dsv)
          </div>
          <div className="p-4 border border-gray-800 rounded bg-gray-900/50">
            <strong className="text-gray-300 block mb-1">STEP 2</strong>
            Edit your Pokémon data safely (Gen 1-9 supported)
          </div>
          <div className="p-4 border border-gray-800 rounded bg-gray-900/50">
            <strong className="text-gray-300 block mb-1">STEP 3</strong>
            Download the modified save
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .blink-cursor {
          animation: blink 1s step-end infinite;
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

PcLanding.propTypes = {
  onFileLoad: PropTypes.func.isRequired,
};

export default PcLanding;
