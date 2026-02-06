export type SSEEventType =
  | 'workstream_updated'
  | 'activity_added'
  | 'question_added'
  | 'question_answered'
  | 'health_changed'
  | 'heartbeat';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: string;
}

export interface WorkstreamUpdatedEvent extends SSEEvent {
  type: 'workstream_updated';
  data: {
    workstream_id: string;
    changes: string[];
  };
}

export interface ActivityAddedEvent extends SSEEvent {
  type: 'activity_added';
  data: {
    activity_id: string;
  };
}

export interface QuestionEvent extends SSEEvent {
  type: 'question_added' | 'question_answered';
  data: {
    question_id: string;
  };
}

export interface HeartbeatEvent extends SSEEvent {
  type: 'heartbeat';
  data: null;
}
