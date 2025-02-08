const RefineLogo = () => {
    return (
        <a
            href="/"
            style={{
                display: 'flex',
                alignItems: 'center',
                height: '48px',
                textDecoration: 'none'
            }}
            aria-label="Return to Refine homepage"
        >
            <svg
                viewBox="0 0 200 50"
                style={{
                    height: '100%',
                    width: 'auto'
                }}
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-hidden="true"
            >
                {/* Diamond shape representing refinement */}
                <path
                    d="M30 25 L40 10 L50 25 L40 40 Z"
                    fill="#ffffff"
                    stroke="none"
                />

                {/* Smaller diamond overlapping */}
                <path
                    d="M35 25 L40 20 L45 25 L40 30 Z"
                    fill="#1a365d"
                    stroke="none"
                />

                {/* Text */}
                <text
                    x="65"
                    y="32"
                    fontFamily="Arial, sans-serif"
                    fontSize="24"
                    fontWeight="bold"
                    fill="#ffffff"
                >
                    refine
                </text>
            </svg>
        </a>
    );
};

export default RefineLogo;
