import os
import shutil

# Define the words for each level
basic_words = [
    "我", "你", "他", "她", "我们", "你们", "他们", "是", "有", "去", "来", "吃", "喝", "看", "说", "做",
    "人", "东西", "书", "水", "饭", "家", "学校", "昨天", "今天", "明天", "早上", "下午", "这里", "那里",
    "了", "吗", "的", "呢", "一", "两", "三", "个", "本"
]

intermediate_words = [
    "自己", "大家", "别人", "什么", "谁", "哪里", "怎么", "想", "要", "能", "可以", "应该", "知道", "觉得",
    "喜欢", "帮助", "学习", "工作", "买", "卖", "朋友", "老师", "学生", "公司", "医院", "问题", "时间",
    "钱", "电话", "电脑", "现在", "以前", "以后", "每天", "有时候", "外面", "里面", "上面", "下面", "旁边",
    "过", "着", "得", "地", "吧", "和", "或者", "但是", "因为"
]

advanced_words = [
    "彼此", "本人", "任何", "某", "其他", "认为", "发现", "理解", "分析", "讨论", "解释", "表示", "证明",
    "导致", "影响", "促进", "实现", "获得", "提供", "采取", "观点", "原因", "结果", "方法", "过程", "情况",
    "关系", "经验", "目标", "责任", "目前", "此时", "当时", "最终", "随时", "然而", "尽管", "由于", "根据",
    "通过", "关于", "对于", "除了", "为了", "作为", "逐渐", "不断", "完全", "相当"
]

# Base directory
base_dir = r"d:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\assets\audio"

# Move files to respective folders
def move_files(words, level):
    level_dir = os.path.join(base_dir, level)
    os.makedirs(level_dir, exist_ok=True)
    
    for word in words:
        src = os.path.join(base_dir, f"{word}.mp3")
        dst = os.path.join(level_dir, f"{word}.mp3")
        if os.path.exists(src):
            shutil.move(src, dst)
            print(f"Moved {word}.mp3 to {level}")
        else:
            print(f"File {word}.mp3 not found")

move_files(basic_words, "basic")
move_files(intermediate_words, "intermediate")
move_files(advanced_words, "advanced")

print("Audio file organization complete!")