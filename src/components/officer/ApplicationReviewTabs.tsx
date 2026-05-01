'use client';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { OverviewTab } from './OverviewTab';
import { OfficerDocumentReview } from './OfficerDocumentReview';
import { WorkflowTimeline } from './WorkflowTimeline';
import { MessageThread } from './MessageThread';
import { AIScoreDisplay } from '@/components/application/AIScoreDisplay';
import type { Application, DocumentMeta } from '@/types';

interface ApplicationReviewTabsProps {
  application: Application;
  documents: DocumentMeta[];
}

export function ApplicationReviewTabs({
  application,
  documents,
}: ApplicationReviewTabsProps) {
  const t = useTranslations();

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="overview">{t('officer.tabOverview')}</TabsTrigger>
        <TabsTrigger value="documents">{t('officer.tabDocuments')}</TabsTrigger>
        <TabsTrigger value="timeline">{t('officer.tabTimeline')}</TabsTrigger>
        <TabsTrigger value="messages">{t('officer.tabMessages')}</TabsTrigger>
        <TabsTrigger value="ai">{t('officer.tabAiScoring')}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <OverviewTab application={application} />
      </TabsContent>

      <TabsContent value="documents" className="mt-4">
        <OfficerDocumentReview
          applicationId={application.id}
          documents={documents}
          buildingType={application.building_type}
        />
      </TabsContent>

      <TabsContent value="timeline" className="mt-4">
        <WorkflowTimeline applicationId={application.id} />
      </TabsContent>

      <TabsContent value="messages" className="mt-4">
        <MessageThread applicationId={application.id} />
      </TabsContent>

      <TabsContent value="ai" className="mt-4">
        <AIScoreDisplay applicationId={application.id} />
      </TabsContent>
    </Tabs>
  );
}
