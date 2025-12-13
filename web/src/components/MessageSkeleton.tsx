'use client';

import { memo } from 'react';

interface MessageSkeletonProps {
  count?: number;
  styleType?: 'chatgpt' | 'clean';
}

const SkeletonLine = memo(function SkeletonLine({
  width,
  isCleanStyle
}: {
  width: string;
  isCleanStyle: boolean;
}) {
  return (
    <div
      className="h-4 rounded animate-pulse"
      style={{
        width,
        backgroundColor: isCleanStyle ? '#e5e7eb' : '#374151',
      }}
    />
  );
});

const SingleMessageSkeleton = memo(function SingleMessageSkeleton({
  isUser,
  isCleanStyle,
}: {
  isUser: boolean;
  isCleanStyle: boolean;
}) {
  return (
    <div
      style={{
        paddingTop: '1rem',
        paddingBottom: '1rem',
        backgroundColor: isCleanStyle
          ? (isUser ? '#ffffff' : '#f9fafb')
          : (isUser ? '#212121' : '#1a1a1a'),
      }}
    >
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex gap-4">
          {/* Avatar skeleton */}
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full animate-pulse"
            style={{
              backgroundColor: isCleanStyle ? '#d1d5db' : '#4b5563',
            }}
          />

          <div className="flex-1 min-w-0 space-y-3">
            {/* Name skeleton */}
            <SkeletonLine width="80px" isCleanStyle={isCleanStyle} />

            {/* Content skeleton - multiple lines */}
            <div className="space-y-2">
              <SkeletonLine width="100%" isCleanStyle={isCleanStyle} />
              <SkeletonLine width="95%" isCleanStyle={isCleanStyle} />
              <SkeletonLine width="88%" isCleanStyle={isCleanStyle} />
              {!isUser && (
                <>
                  <SkeletonLine width="92%" isCleanStyle={isCleanStyle} />
                  <SkeletonLine width="75%" isCleanStyle={isCleanStyle} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export const MessageSkeleton = memo(function MessageSkeleton({
  count = 4,
  styleType = 'chatgpt',
}: MessageSkeletonProps) {
  const isCleanStyle = styleType === 'clean';

  return (
    <div
      className="border-t"
      style={{ borderColor: isCleanStyle ? '#e5e7eb' : '#444444' }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <SingleMessageSkeleton
          key={index}
          isUser={index % 2 === 0}
          isCleanStyle={isCleanStyle}
        />
      ))}
    </div>
  );
});
