export const CompassArrow = ({ rotation }: { rotation: number }) => (
    <div style={{ transform: `rotate(${rotation}deg)` }} className="absolute top-1 right-1 w-12 h-12 transition-transform duration-500 origin-center">
        <svg viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 2.99.71-.71z" />
        </svg>
    </div>
);
