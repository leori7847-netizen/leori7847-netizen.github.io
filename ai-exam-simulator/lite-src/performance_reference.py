import random, time
from concurrent.futures import ThreadPoolExecutor
class TextGeneratorSimulator:
    def __init__(self, delay=0.2, error=0.02):
        self.delay, self.error = delay, error
    def generate(self, prompt):
        time.sleep(self.delay * random.uniform(0.8, 1.2))
        if random.random() < self.error:
            raise RuntimeError("请求失败")
        return prompt + "，模拟续写"
sim = TextGeneratorSimulator()
prompts = ["天气", "电表", "巡检", "故障", "客服", "数据", "模型", "安全", "节能", "应急"]
def test(prompt):
    start = time.perf_counter()
    try:
        output, status = sim.generate(prompt), "成功"
    except RuntimeError as error:
        output, status = str(error), "失败"
    return prompt, status, (time.perf_counter()-start)*1000, output
start = time.perf_counter()
with ThreadPoolExecutor(max_workers=5) as pool:
    results = list(pool.map(test, prompts))
seconds = time.perf_counter()-start
for prompt, status, ms, output in results:
    print(prompt, status, f"{ms:.1f}ms", output)
times = [row[2] for row in results]
ok = sum(row[1] == "成功" for row in results)
print("成功率", f"{ok/len(results):.0%}", "平均耗时", f"{sum(times)/len(times):.1f}ms")
print("吞吐量", f"{len(results)/seconds:.2f}次/秒", "最短/最长", f"{min(times):.1f}/{max(times):.1f}ms")
