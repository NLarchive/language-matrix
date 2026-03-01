#!/usr/bin/env python3
"""
Split intermediate and advanced audio files with uniform volume normalization.
Processes both levels and saves directly to final Hanzi MP3 files.
"""

import os
import sys
from pydub import AudioSegment
from pydub.silence import detect_nonsilent
from pydub.effects import normalize

def split_level_audio(audio_path, output_dir, hanzi_mapping, level_name):
    """
    Split audio by silence detection and save with uniform volume normalization.
    """

    os.makedirs(output_dir, exist_ok=True)

    print(f"\n{'=' * 70}")
    print(f"{level_name.upper()} LEVEL - SPLITTING WITH UNIFORM VOLUME")
    print(f"{'=' * 70}")
    print(f"Input:  {os.path.basename(audio_path)}")
    print(f"Output: {output_dir}\n")

    try:
        # Load audio
        audio = AudioSegment.from_file(audio_path)
        print(f"✓ Audio loaded: {len(audio)}ms, {audio.channels}ch, {audio.frame_rate}Hz")

        # Detect non-silent segments
        print("  Detecting silence...")
        segments = detect_nonsilent(
            audio,
            min_silence_len=300,
            silence_thresh=-40,
            seek_step=10
        )

        print(f"✓ Detected {len(segments)} words")

        if len(segments) != len(hanzi_mapping):
            print(f"⚠ Warning: Detected {len(segments)} segments but expected {len(hanzi_mapping)}")

        print(f"\n  Splitting and normalizing...\n")

        processed_count = 0
        for idx, (start, end) in enumerate(segments, 1):
            if idx > len(hanzi_mapping):
                continue

            hanzi_name = hanzi_mapping[idx-1]
            output_file = os.path.join(output_dir, hanzi_name)

            # Extract segment with padding
            padded_start = max(0, start - 50)
            padded_end = min(len(audio), end + 50)
            segment = audio[padded_start:padded_end]

            # Normalize volume
            normalized_segment = normalize(segment, headroom=0.1)

            # Export as MP3
            normalized_segment.export(output_file, format="mp3", bitrate="128k")

            duration = padded_end - padded_start
            print(f"  {idx:2d}. {hanzi_name:<12} {duration:4d}ms")

            processed_count += 1

        print(f"\n✓ {level_name} Level: {processed_count} files processed")
        return True

    except Exception as e:
        print(f"\n✗ Error processing {level_name}: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    base_path = r"d:\teach\LANGUAGES\chinese\100-Janulus-matrix\chinese-matrix-lenguage-learn\web_v3\assets\audio"

    # Intermediate level configuration
    intermediate_audio = os.path.join(base_path, "intermediate", "intermediate-hanzi-list-audio.webm")
    intermediate_output = os.path.join(base_path, "intermediate")
    intermediate_hanzi = [
        '自己.mp3', '大家.mp3', '别人.mp3', '什么.mp3', '谁.mp3', '哪里.mp3',
        '怎么.mp3', '想.mp3', '要.mp3', '能.mp3', '可以.mp3', '应该.mp3',
        '知道.mp3', '觉得.mp3', '喜欢.mp3', '帮助.mp3', '学习.mp3', '工作.mp3',
        '买.mp3', '卖.mp3', '朋友.mp3', '老师.mp3', '学生.mp3', '公司.mp3',
        '医院.mp3', '问题.mp3', '时间.mp3', '钱.mp3', '电话.mp3', '电脑.mp3',
        '现在.mp3', '以前.mp3', '以后.mp3', '每天.mp3', '有时候.mp3', '外面.mp3',
        '里面.mp3', '上面.mp3', '下面.mp3', '旁边.mp3', '过.mp3', '着.mp3',
        '得.mp3', '地.mp3', '吧.mp3', '和.mp3', '或者.mp3', '但是.mp3',
        '因为.mp3', '所以.mp3', '很.mp3', '太.mp3', '非常.mp3', '都.mp3',
        '也.mp3', '还.mp3', '已经.mp3', '正在.mp3', '几.mp3', '多少.mp3',
        '些.mp3', '次.mp3', '块.mp3'
    ]

    # Advanced level configuration
    advanced_audio = os.path.join(base_path, "advanced", "advanced-hanzi-list-audio.webm")
    advanced_output = os.path.join(base_path, "advanced")
    advanced_hanzi = [
        '彼此.mp3', '本人.mp3', '任何.mp3', '某.mp3', '其他.mp3', '认为.mp3',
        '发现.mp3', '理解.mp3', '分析.mp3', '讨论.mp3', '解释.mp3', '表示.mp3',
        '证明.mp3', '导致.mp3', '影响.mp3', '促进.mp3', '实现.mp3', '获得.mp3',
        '提供.mp3', '采取.mp3', '观点.mp3', '原因.mp3', '结果.mp3', '方法.mp3',
        '过程.mp3', '情况.mp3', '关系.mp3', '经验.mp3', '目标.mp3', '责任.mp3',
        '目前.mp3', '此时.mp3', '当时.mp3', '最终.mp3', '随时.mp3', '然而.mp3',
        '尽管.mp3', '由于.mp3', '根据.mp3', '通过.mp3', '关于.mp3', '对于.mp3',
        '除了.mp3', '为了.mp3', '作为.mp3', '逐渐.mp3', '不断.mp3', '完全.mp3',
        '相当.mp3', '显然.mp3', '确实.mp3', '必须.mp3', '往往.mp3', '几乎.mp3',
        '从而.mp3', '而.mp3', '之.mp3', '所.mp3', '者.mp3', '各.mp3',
        '整.mp3', '另.mp3'
    ]

    print("=" * 70)
    print("AUDIO SPLITTING: INTERMEDIATE & ADVANCED LEVELS")
    print("=" * 70)

    results = []

    # Process intermediate level
    if os.path.exists(intermediate_audio):
        success = split_level_audio(
            intermediate_audio,
            intermediate_output,
            intermediate_hanzi,
            "intermediate"
        )
        results.append(("Intermediate", success))
    else:
        print(f"\n✗ Intermediate audio not found: {intermediate_audio}")
        results.append(("Intermediate", False))

    # Process advanced level
    if os.path.exists(advanced_audio):
        success = split_level_audio(
            advanced_audio,
            advanced_output,
            advanced_hanzi,
            "advanced"
        )
        results.append(("Advanced", success))
    else:
        print(f"\n✗ Advanced audio not found: {advanced_audio}")
        results.append(("Advanced", False))

    # Summary
    print(f"\n{'=' * 70}")
    print("SUMMARY")
    print(f"{'=' * 70}")
    for level, success in results:
        status = "✓ Success" if success else "✗ Failed"
        print(f"{level:15} {status}")

    all_success = all(success for _, success in results)
    print(f"\n{'=' * 70}")
    if all_success:
        print("✓ ALL LEVELS PROCESSED SUCCESSFULLY!")
        print("All audio files normalized and renamed")
    else:
        print("✗ Some levels failed to process")
    print(f"{'=' * 70}\n")

    return 0 if all_success else 1

if __name__ == "__main__":
    sys.exit(main())
