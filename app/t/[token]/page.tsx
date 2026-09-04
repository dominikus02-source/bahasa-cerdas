import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"

export default async function TaskShareResolver({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  if (!token || token.length < 6) {
    redirect("/")
  }

  const shareToken = await db.taskShareToken.findUnique({
    where: { token },
    include: {
      group: { select: { id: true, name: true } },
      penugasan: { select: { id: true, judul: true } },
    },
  })

  if (!shareToken) {
    redirect("/")
  }

  const user = await getUser()
  if (!user) {
    redirect(`/login?next=/t/${token}`)
  }

  // Check if user is a member of the group (teacher or student)
  const isMember = await db.groupMember.findFirst({
    where: {
      groupId: shareToken.groupId,
      userId: user.id,
    },
  })

  // Also allow teacher (group owner)
  const isTeacher = await db.group.findFirst({
    where: {
      id: shareToken.groupId,
      teacherId: user.id,
    },
  })

  if (!isMember && !isTeacher) {
    // Not a member — redirect to their beranda
    redirect("/murid/beranda")
  }

  // Resolve redirect URL based on task type
  if (shareToken.taskType === "QUIZ" && shareToken.quizId) {
    // Find the QuizAssignment for this quiz in this group
    const assignment = await db.quizAssignment.findFirst({
      where: {
        quizId: shareToken.quizId,
        groupId: shareToken.groupId,
      },
    })

    if (assignment) {
      // Check if student has already submitted
      const existingSubmission = await db.quizSubmission.findFirst({
        where: {
          assignmentId: assignment.id,
          userId: user.id,
          status: { in: ["SUBMITTED", "GRADED"] },
        },
      })

      if (existingSubmission) {
        redirect(`/murid/tugasku/${assignment.id}/result`)
      }

      redirect(`/murid/tugasku/${assignment.id}/take`)
    }

    // Fallback: quiz exists but no assignment for this group
    redirect("/murid/tugasku")
  }

  if (shareToken.taskType === "PENUGASAN" && shareToken.penugasanId) {
    // Check if student has already completed
    const existingSubmission = await db.penugasanSubmission.findFirst({
      where: {
        penugasanId: shareToken.penugasanId,
        userId: user.id,
        status: "COMPLETED",
      },
    })

    if (existingSubmission) {
      redirect(`/arena/tugas/${shareToken.penugasanId}/kerjakan`)
    }

    redirect(`/arena/tugas/${shareToken.penugasanId}/kerjakan`)
  }

  // Fallback
  redirect("/murid/tugasku")
}
