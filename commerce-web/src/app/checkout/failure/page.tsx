'use client';

import React from 'react';
import { Suspense } from 'react';
import FailureContent from './failure-content';

export default function FailurePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FailureContent />
    </Suspense>
  );
}
