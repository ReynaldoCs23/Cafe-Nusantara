import React from 'react';

const AbstractBackgroundWrapper = ({ children, pageType = 'default' }) => {
    
    // Define the abstract blob elements based on the page type
    const renderBlobs = () => {
        switch (pageType) {
            case 'about':
                return (
                    <>
                        {/* Soft cream base with a subtle warm mocha glow in the top right */}
                        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#8B5A2B]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
                        <div className="absolute bottom-[20%] left-[-10%] w-[400px] h-[400px] bg-[#8B5A2B]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
                    </>
                );
            case 'menu':
                return (
                    <>
                        {/* Very faint matcha green and latte brown mesh */}
                        <div className="absolute top-[10%] left-[-5%] w-[500px] h-[500px] bg-[#4A5D23]/5 blur-[100px] rounded-full pointer-events-none z-0"></div>
                        <div className="absolute bottom-[10%] right-[-5%] w-[600px] h-[600px] bg-[#8B5A2B]/5 blur-[100px] rounded-full pointer-events-none z-0"></div>
                        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#C06C53]/3 blur-[120px] rounded-full pointer-events-none z-0"></div>
                    </>
                );
            case 'location':
                return (
                    <>
                        {/* Earthy off-white with a subtle deep espresso shadow in the bottom left */}
                        <div className="absolute bottom-[-10%] left-[-10%] w-[700px] h-[700px] bg-[#3B2F2F]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
                        <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] bg-[#8B5A2B]/5 blur-[100px] rounded-full pointer-events-none z-0"></div>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="relative w-full min-h-screen bg-[#fdfbf7] overflow-hidden">
            {renderBlobs()}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};

export default AbstractBackgroundWrapper;
