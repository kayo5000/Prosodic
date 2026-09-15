import re

path = r"C:\Users\bsfka\.gemini\antigravity\brain\0a36d100-9ebc-4420-bea3-8670293e047d\.system_generated\steps\1353\content.md"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

titles = re.findall(r"<title>(.*?)</title>", text)
print("HTML Title:", titles)

meta_titles = re.findall(r'"title":\s*"(.*?)"', text)
print("Meta Titles:", meta_titles[:5])

meta_desc = re.findall(r'"description":\s*"(.*?)"', text)
print("Meta Descriptions:", meta_desc[:3])
