import React from 'react';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ fullScreen = false }) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#002c1f] rounded-[20px]">
        <div className="relative w-[40%] aspect-square">
          <style>{`
            @keyframes abox1 {
              0% {
                width: 100%;
                height: 43%;
                margin-top: 57%;
                margin-left: 0;
              }
              12.5% {
                width: 43%;
                height: 43%;
                margin-top: 57%;
                margin-left: 0;
              }
              25%, 37.5%, 50%, 62.5% {
                width: 43%;
                height: 43%;
                margin-top: 57%;
                margin-left: 0;
              }
              75% {
                width: 43%;
                height: 100%;
                margin-top: 0;
                margin-left: 0;
              }
              87.5%, 100% {
                width: 43%;
                height: 43%;
                margin-top: 0;
                margin-left: 0;
              }
            }

            @keyframes abox2 {
              0%, 12.5%, 25%, 37.5% {
                width: 43%;
                height: 43%;
                margin-top: 0;
                margin-left: 0;
              }
              50% {
                width: 100%;
                height: 43%;
                margin-top: 0;
                margin-left: 0;
              }
              62.5%, 75%, 87.5%, 100% {
                width: 43%;
                height: 43%;
                margin-top: 0;
                margin-left: 57%;
              }
            }

            @keyframes abox3 {
              0%, 12.5% {
                width: 43%;
                height: 43%;
                margin-top: 0;
                margin-left: 57%;
              }
              25% {
                width: 43%;
                height: 100%;
                margin-top: 0;
                margin-left: 57%;
              }
              37.5%, 50%, 62.5%, 75%, 87.5% {
                width: 43%;
                height: 43%;
                margin-top: 57%;
                margin-left: 57%;
              }
              100% {
                width: 100%;
                height: 43%;
                margin-top: 57%;
                margin-left: 0;
              }
            }

            .loader-box1 {
              animation: abox1 2s 1s forwards ease-in-out infinite;
            }

            .loader-box2 {
              animation: abox2 2s 1s forwards ease-in-out infinite;
            }

            .loader-box3 {
              animation: abox3 2s 1s forwards ease-in-out infinite;
            }
          `}</style>
          <div className="loader-box1 absolute block border-[calc(1vh+1vw)] border-white rounded-[10px] w-full h-[43%] mt-[57%] ml-0" />
          <div className="loader-box2 absolute block border-[calc(1vh+1vw)] border-white rounded-[10px] w-[43%] h-[43%] mt-0 ml-0" />
          <div className="loader-box3 absolute block border-[calc(1vh+1vw)] border-white rounded-[10px] w-[43%] h-[43%] mt-0 ml-[57%]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className="relative w-16 aspect-square">
        <style>{`
          @keyframes spin-box {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(180deg); }
          }
        `}</style>
        <div className="absolute inset-0 border-4 border-primary rounded-lg animate-[spin-box_2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
};
