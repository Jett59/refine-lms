const RefineLogo = () => {
    return (
        <div style={{ position: 'relative' }}>
            <a
                href="/"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '48px',
                    textDecoration: 'none',
                }}
                aria-label="refine"
            >
                <svg
                    viewBox="0 0 200 50"
                    style={{
                        height: '100%',
                        width: 'auto',
                        filter: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.5))'
                    }}
                    xmlns="http://www.w3.org/2000/svg"
                    role="img"
                    aria-hidden="true"
                >
                    <path
                        d="M30 25 L40 10 L50 25 L40 40 Z"
                        fill="#ffffff"
                        stroke="none"
                    />
                    <path
                        d="M35 25 L40 17.5 L45 25 L40 32.5 Z"
                        fill="#4f46e5"
                        stroke="none"
                    />
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
        </div>
    );
};

export default RefineLogo;
