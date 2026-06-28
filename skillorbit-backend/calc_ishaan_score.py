import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ml.ranker import CandidateRanker

dir_path = os.path.join('.', 'ml', 'ranker_data')
ranker = CandidateRanker.load(dir_path)

df = ranker.rank('Design and deploy scalable AI/ML systems serving millions of users.', top_k=2000)

ishaan = df[df['name'] == 'Ishaan Patel'].iloc[0]
print('Ishaan Patel breakdown:')
print(f'  semantic_sim     = {ishaan["semantic_sim"]}')
print(f'  technicalFit     = {ishaan["technicalFit"]}')
print(f'  skillMatch       = {ishaan["skillMatch"]}')
print(f'  experienceLevel  = {ishaan["experienceLevel"]}')
print(f'  careerGrowth     = {ishaan["careerGrowth"]}')
print(f'  cultureSignal    = {ishaan["cultureSignal"]}')
print(f'  successScore     = {ishaan["successScore"]}')
print(f'  final_score      = {ishaan["final_score"]}')

tf = ishaan['technicalFit'] / 100.0
sm = ishaan['skillMatch'] / 100.0
el = ishaan['experienceLevel'] / 100.0
cg = ishaan['careerGrowth'] / 100.0
cs = ishaan['cultureSignal'] / 100.0
ss = ishaan['successScore'] / 100.0

dim_blend = 0.30*tf + 0.25*sm + 0.15*el + 0.15*cg + 0.10*cs + 0.05*ss
sem = ishaan['semantic_sim'] / 100.0
manual = round((0.55 * sem + 0.45 * dim_blend) * 100, 1)

print(f'\nManual calculation:')
print(f'  dim_blend = 0.30*{tf} + 0.25*{sm} + 0.15*{el} + 0.15*{cg} + 0.10*{cs} + 0.05*{ss}')
print(f'  dim_blend = {dim_blend:.4f}')
print(f'  final_score = (0.55 * {sem} + 0.45 * {dim_blend:.4f}) * 100')
print(f'  final_score = {manual}')
