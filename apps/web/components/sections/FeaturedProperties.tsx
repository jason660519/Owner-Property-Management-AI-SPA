'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '../ui/Button';
import { Card, CardImage, CardContent, CardFooter } from '../ui/Card';
import styles from './FeaturedProperties.module.css';
import { Property } from '@/lib/api/properties';

interface FeaturedPropertiesProps {
  properties: Property[];
}

export function FeaturedProperties({ properties }: FeaturedPropertiesProps) {
  // Display top 3
  const displayedProperties = properties.slice(0, 3);

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.sparkle}>✨</span>
            <h2 className={styles.title}>精選物業</h2>
            <p className={styles.description}>
              探索我們精心挑選的優質物業，每一間都經過嚴格篩選，確保您獲得最佳的居住體驗。
            </p>
          </div>
          <Link href="/properties" className={styles.viewAll}>
            <Button variant="secondary">
              查看全部物業
            </Button>
          </Link>
        </div>

        {/* Properties Grid */}
        <div className={styles.grid}>
          {displayedProperties.map((property) => (
            <Link key={property.id} href={`/properties/${property.id}`} className={styles.cardLink}>
              <Card hoverable padding="md">
                <CardImage
                  src={property.imageUrl}
                  alt={property.title}
                  aspectRatio="16/9"
                />
                <CardContent>
                  <div className={styles.propertyHeader}>
                    <h3 className={styles.propertyTitle}>{property.title}</h3>
                  </div>
                  <p className={styles.propertyDescription}>{property.description}</p>

                  {/* Property Details */}
                  <div className={styles.propertyDetails}>
                    <span className={styles.detail}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 21V7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3 11H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9 21V16H15V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {property.bedrooms} 房
                    </span>
                    <span className={styles.detail}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 12H20V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6 12V6C6 4.89543 6.89543 4 8 4H9C10.1046 4 11 4.89543 11 6V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 15H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {property.bathrooms} 衛
                    </span>
                    <span className={styles.detail}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {property.type}
                    </span>
                  </div>
                </CardContent>
                <CardFooter>
                  <span className={styles.price}>{property.price}</span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>

        {/* Pagination removed as this is a featured section, not a full list */}
      </div>
    </section>
  );
}

export default FeaturedProperties;