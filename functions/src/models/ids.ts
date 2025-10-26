declare const __brand: unique symbol;

type Brand<T, TBrand> = T & { [__brand]: TBrand };

export type QuizId = Brand<string, "QuizId">;
export type QuizSessionId = Brand<string, "QuizSessionId">;
export type QuizStateId = QuizSessionId;
export type QuestionId = Brand<string, "QuestionId">;
export type UserId = Brand<string, "UserId">;
