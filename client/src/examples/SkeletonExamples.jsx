import React, { useState, useEffect } from 'react';
import { Skeleton, SkeletonTable, SkeletonCard, SkeletonList } from '../components/Skeleton';

/**
 * EJEMPLO DE USO - SKELETON LOADER
 * 
 * Demuestra cómo usar los skeleton loaders en diferentes escenarios
 */

const SkeletonExamples = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        // Simular carga de datos
        setTimeout(() => {
            setData({ name: 'John Doe', email: 'john@example.com' });
            setLoading(false);
        }, 2000);
    }, []);

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>Skeleton Loader Examples</h1>

            {/* Ejemplo 1: Skeleton básico */}
            <section style={{ marginBottom: '40px' }}>
                <h2>1. Basic Text Skeleton</h2>
                {loading ? (
                    <div>
                        <Skeleton variant="title" width="40%" />
                        <Skeleton variant="text" count={3} />
                    </div>
                ) : (
                    <div>
                        <h3>{data.name}</h3>
                        <p>Email: {data.email}</p>
                        <p>Lorem ipsum dolor sit amet...</p>
                    </div>
                )}
            </section>

            {/* Ejemplo 2: Skeleton Table */}
            <section style={{ marginBottom: '40px' }}>
                <h2>2. Table Skeleton</h2>
                {loading ? (
                    <SkeletonTable rows={5} columns={4} />
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>{data.name}</td>
                                <td>{data.email}</td>
                                <td>Active</td>
                                <td>Edit</td>
                            </tr>
                        </tbody>
                    </table>
                )}
            </section>

            {/* Ejemplo 3: Card Skeleton */}
            <section style={{ marginBottom: '40px' }}>
                <h2>3. Card Skeleton</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {loading ? (
                        <>
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                        </>
                    ) : (
                        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px' }}>
                            <h3>{data.name}</h3>
                            <p>{data.email}</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Ejemplo 4: List Skeleton */}
            <section style={{ marginBottom: '40px' }}>
                <h2>4. List Skeleton</h2>
                {loading ? (
                    <SkeletonList items={5} />
                ) : (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ccc' }} />
                            <div>
                                <div>{data.name}</div>
                                <div>{data.email}</div>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Ejemplo 5: Avatar + Text */}
            <section style={{ marginBottom: '40px' }}>
                <h2>5. Avatar + Text Combination</h2>
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Skeleton variant="circle" width="60px" height="60px" />
                        <div style={{ flex: 1 }}>
                            <Skeleton variant="text" width="30%" />
                            <Skeleton variant="text" width="50%" />
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#ccc' }} />
                        <div>
                            <div>{data.name}</div>
                            <div>{data.email}</div>
                        </div>
                    </div>
                )}
            </section>

            {/* Ejemplo 6: Custom dimensions */}
            <section style={{ marginBottom: '40px' }}>
                <h2>6. Custom Dimensions</h2>
                {loading ? (
                    <div>
                        <Skeleton width="200px" height="200px" borderRadius="12px" />
                        <Skeleton width="100%" height="30px" />
                        <Skeleton width="80%" height="20px" />
                    </div>
                ) : (
                    <div>Content loaded!</div>
                )}
            </section>

            <button onClick={() => setLoading(!loading)}>
                Toggle Loading State
            </button>
        </div>
    );
};

export default SkeletonExamples;
