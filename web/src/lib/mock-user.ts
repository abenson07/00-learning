export type MockUserRole = "teacher" | "student";

export type MockUser = {
  id: string;
  role: MockUserRole;
};

export const DEFAULT_MOCK_USER: MockUser = {
  id: "student-1",
  role: "student",
};

export const MOCK_USER_STORAGE_KEY = "learning_platform_mock_user_v1";

