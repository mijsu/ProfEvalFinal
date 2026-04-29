import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firestore';

// GET - Fetch evaluation report data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const facultyId = searchParams.get('facultyId');
    const subjectId = searchParams.get('subjectId');

    const whereClause: any = {};
    if (facultyId) whereClause.facultyId = facultyId;
    if (subjectId) whereClause.subjectId = subjectId;

    const evaluations = await db.evaluation.findMany({
      where: whereClause,
      include: {
        student: true,
        subject: true,
        faculty: true
      }
    });

    // Group by faculty
    const facultyStats = new Map<string, any>();
    
    for (const evaluation of evaluations) {
      const fid = evaluation.facultyId;
      
      if (!facultyStats.has(fid)) {
        facultyStats.set(fid, {
          facultyId: fid,
          facultyName: evaluation.faculty?.name || evaluation.subject?.instructorName || 'Unknown',
          department: evaluation.faculty?.department || 'Unknown',
          evaluations: [],
          totalScore: 0,
          count: 0
        });
      }
      
      const stats = facultyStats.get(fid);
      stats.evaluations.push(evaluation);
      stats.totalScore += evaluation.totalScore;
      stats.count += 1;
    }

    // Calculate averages
    const reportData = Array.from(facultyStats.values()).map(stats => ({
      id: stats.facultyId,
      name: stats.facultyName,
      facultyId: stats.facultyId,
      facultyName: stats.facultyName,
      department: stats.department,
      evaluations: stats.count,
      average: stats.count > 0 ? parseFloat(((stats.totalScore / stats.count / 5 / 20) * 100).toFixed(0)) : 0
    }));

    // Build the report data object matching frontend expectations
    const allScores = evaluations.map((e: any) => e.totalScore || 0);
    const overallAvg = allScores.length > 0
      ? (allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length / 5 * 20)
      : 0;

    const fullReportData = {
      totalEvaluations: evaluations.length,
      averageScore: parseFloat(overallAvg.toFixed(2)),
      facultyPerformance: reportData,
      subjectPerformance: [],
      semesterData: [],
      recentEvaluations: evaluations.slice(0, 10).map((e: any) => ({
        id: e.id,
        facultyId: e.facultyId,
        faculty: e.faculty?.name || e.subject?.instructorName || 'Unknown',
        subject: e.subject?.code || e.subject?.title || 'Unknown',
        subjectTitle: e.subject?.title || 'Unknown',
        studentName: e.student?.fullName || e.student?.username || 'Unknown',
        score: e.totalScore || 0,
        date: e.submittedAt
      }))
    };

    return NextResponse.json({
      success: true,
      reportData: fullReportData
    });
  } catch (error: any) {
    console.error('Get report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
