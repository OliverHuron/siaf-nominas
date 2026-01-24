import React from 'react';
import './UniversalSkeleton.css';

const UniversalSkeleton = ({ rows = 8 }) => {
    return (
        <div className="universal-skeleton-wrapper">
            {[...Array(rows)].map((_, index) => (
                <div key={index} className="universal-skeleton-row">
                    <div className="skeleton-bar" style={{ width: '15%' }}></div>
                    <div className="skeleton-bar" style={{ width: '25%' }}></div>
                    <div className="skeleton-bar" style={{ width: '20%' }}></div>
                    <div className="skeleton-bar" style={{ width: '12%' }}></div>
                    <div className="skeleton-bar" style={{ width: '18%' }}></div>
                    <div className="skeleton-bar" style={{ width: '10%' }}></div>
                </div>
            ))}
        </div>
    );
};

export default UniversalSkeleton;
