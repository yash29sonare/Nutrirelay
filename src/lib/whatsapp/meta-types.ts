export interface MetaWebhookMessage {
  id?: string;
  from?: string;
  type?: string;
  context?: {
    id?: string;
    from?: string;
  };
  text?: {
    body?: string;
  };
  interactive?: {
    button_reply?: {
      id?: string;
      title?: string;
    };
    list_reply?: {
      id?: string;
      title?: string;
    };
  };
  image?: {
    id?: string;
    caption?: string;
  };
  audio?: {
    id?: string;
  };
}

export interface MetaWebhookStatus {
  id?: string;
  status?: string;
  recipient_id?: string;
  timestamp?: string;
  conversation?: {
    id?: string;
    expiration_timestamp?: string;
    origin?: {
      type?: string;
    };
  };
  pricing?: {
    category?: string;
    pricing_model?: string;
    billable?: boolean;
  };
  errors?: unknown;
}

export interface MetaWebhookValue {
  messages?: MetaWebhookMessage[];
  statuses?: MetaWebhookStatus[];
}

export interface MetaWebhookPayload {
  entry?: Array<{
    id?: string;
    changes?: Array<{
      value?: MetaWebhookValue;
    }>;
  }>;
}
