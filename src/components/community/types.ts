// /community 공통 타입. API 응답 + 컴포넌트 prop 양쪽에서 사용.

export type CommunityTag = {
  id: string;
  value: string;
  sortOrder: number | null;
};

export type CommunityPostListItem = {
  id: string;
  nicknameSnapshot: string;
  title: string;
  bodyPreview: string;
  hasImage: boolean;
  imageUrl: string;
  tag: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
};

export type CommunityPostDetail = {
  id: string;
  sessionId: string;
  nicknameSnapshot: string;
  title: string;
  body: string;
  imageUrl: string;
  tag: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
};

export type CommunityComment = {
  id: string;
  sessionId: string;
  nicknameSnapshot: string;
  body: string;
  createdAt: string;
};

export type CommunityFeedPage = {
  items: CommunityPostListItem[];
  nextCursor: string | null;
};
