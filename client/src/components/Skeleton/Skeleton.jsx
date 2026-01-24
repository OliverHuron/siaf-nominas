import React from 'react';
import './Skeleton.css';

/**
 * Skeleton Loader Component - Super Optimized
 * Uses CSS-only animations with GPU acceleration
 * Zero JS overhead during animation
 */

const Skeleton = ({
    variant = 'text',
    width,
    height,
    borderRadius,
    count = 1,
    className = ''
}) => {
    const skeletons = Array.from({ length: count }, (_, i) => i);

    const getVariantStyles = () => {
        switch (variant) {
            case 'text':
                return {
                    width: width || '100%',
                    height: height || '16px',
                    borderRadius: borderRadius || '4px'
                };
            case 'title':
                return {
                    width: width || '60%',
                    height: height || '28px',
                    borderRadius: borderRadius || '4px'
                };
            case 'circle':
                return {
                    width: width || '40px',
                    height: height || '40px',
                    borderRadius: '50%'
                };
            case 'rect':
                return {
                    width: width || '100%',
                    height: height || '200px',
                    borderRadius: borderRadius || '8px'
                };
            case 'avatar':
                return {
                    width: width || '40px',
                    height: height || '40px',
                    borderRadius: '50%'
                };
            default:
                return {
                    width: width || '100%',
                    height: height || '16px',
                    borderRadius: borderRadius || '4px'
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <>
            {skeletons.map((_, index) => (
                <div
                    key={index}
                    className={`skeleton ${className}`}
                    style={styles}
                    aria-busy="true"
                    aria-live="polite"
                />
            ))}
        </>
    );
};

// Preset skeleton layouts
export const SkeletonTable = ({ rows = 5, columns = 4 }) => (
    <div className="skeleton-table">
        {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="skeleton-table-row">
                {Array.from({ length: columns }, (_, j) => (
                    <Skeleton key={j} variant="text" width="100%" />
                ))}
            </div>
        ))}
    </div>
);

export const SkeletonCard = () => (
    <div className="skeleton-card">
        <Skeleton variant="rect" height="200px" />
        <div className="skeleton-card-content">
            <Skeleton variant="title" width="70%" />
            <Skeleton variant="text" width="100%" count={3} />
        </div>
    </div>
);

export const SkeletonList = ({ items = 5 }) => (
    <div className="skeleton-list">
        {Array.from({ length: items }, (_, i) => (
            <div key={i} className="skeleton-list-item">
                <Skeleton variant="avatar" width="48px" height="48px" />
                <div className="skeleton-list-content">
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="text" width="90%" />
                </div>
            </div>
        ))}
    </div>
);

export default Skeleton;
