import { QuizPage } from '@/features/quizzes/quiz-take';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuizPage quizId={id} />;
}
