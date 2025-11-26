"use client";

import { useState, useEffect } from "react";

const PROMPTS = [
  "如果明天是世界终结，你的角色会做什么？",
  "角色第一次流泪，是因为什么？",
  "角色小时候最害怕的东西是什么？",
  "角色若拥有一次不被发现的机会，他会做什么？",
  "对角色来说，什么是“家”？",
  "角色最常对别人隐瞒的秘密是什么？",
  "角色有什么别人不知道的小癖好？",
  "如果可以选择忘记一件事，角色会忘记什么？",
  "角色收到过最珍贵的礼物是什么？",
  "如果角色突然失去力量/技能，他会如何反应？",
  "角色对“命运”二字的态度是什么？",
  "角色最想对某个人说却不敢说的一句是什么？",
  "他会如何描述自己在世界中的位置？",
  "角色认为自己真正的敌人是谁？",
  "如果必需牺牲一件重要之物，角色会舍弃什么？",
  "角色最讨厌别人问的问题是什么？",
  "最能激怒角色的是什么？",
  "角色醒来发现自己穿越到过去，他会先做什么？",
  "角色第一次意识到“自己在变强”的瞬间是什么？",
  "若角色突然被赋予一笔巨大财富，他会怎么用？",
  "角色最珍惜的人是谁？",
  "角色会如何面对背叛？",
  "曾让角色彻夜难眠的事情是什么？",
  "世界上让角色感到安心的地方是哪里？",
  "角色会把什么东西放在口袋里随身带着？",
  "如果角色只能留下三个词，他们会写什么？",
  "他最想重新来过的瞬间是什么？",
  "角色在愤怒时会做出怎样的举动？",
  "如果角色遇见十年后的自己，他们会说什么？",
  "他相信奇迹吗？",
  "角色是否愿意为了某人堕落？",
  "角色最不愿提起的过去是什么？",
  "角色最讨厌的声音是什么？",
  "如果角色突然变成孩子，他会怎样行动？",
  "他最想毁掉的一样东西是什么？",
  "角色会为了谁而违背自己的原则？",
  "角色觉得自己的命运由什么驱动？",
  "他希望别人记住自己什么？",
  "角色最恐惧失去的人或物是什么？",
  "若角色可以重写一条规则，他会改什么？",
  "他曾在哪一刻真正感到孤独？",
  "角色对“死亡”抱有什么看法？",
  "若角色可以隐身一天，他会去做什么？",
  "角色身上最奇怪的习惯是什么？",
  "他认为什么才算“力量”？",
  "若角色可以重来一次告别，他想对谁说？",
  "角色曾相信却被打破的事情是什么？",
  "若角色必须和敌人合作，他会怎么办？",
  "他认为自己会成为英雄还是反派？",
  "角色人生的底线是什么？",
  "若角色拿到一个预言，他会相信吗？",
  "角色放弃过最重要的是什么？",
  "角色在深夜里最常想到什么？",
  "若角色遇到一个完全信任他的人，他会如何对待？",
  "角色对友情的定义是什么？",
  "他最想向命运质问的一句是什么？",
  "若角色拥有读心术，他最害怕听见什么？",
  "角色想改变的第一件事是什么？",
  "他会如何表达愧疚？",
  "角色最想隐藏的一部分是什么？",
  "哪个季节最能代表角色？",
  "若角色突然得到一次“忘忧”的机会，他会用吗？",
  "他最讨厌自己的哪一点？",
  "角色是否曾经羡慕过某人？",
  "如果角色必须写一封无法寄出的信，他会写些什么？",
  "角色是否相信自己的价值？",
  "角色做过的最冲动的事是什么？",
  "若角色变成反派，他的动机会是什么？",
  "他放弃过谁？又是否后悔？",
  "哪句评价最能刺痛你的角色？",
  "若角色接到一个神秘邀请，他会选择赴约吗？",
  "角色最后悔没有说出口的话是什么？",
  "他最想拥有什么力量？",
  "若角色有一个“无法说出口的愿望”，那是什么？",
  "他最渴望收到的回应是什么？",
  "角色如何面对失败？",
  "若角色和自己最讨厌的人困在一起，他会先做什么？",
  "角色有没有什么自己都不理解的习惯？",
  "他觉得自己最温柔的一面是什么？",
  "若有人能看见角色真正的心，他希望对方看到什么？",
  "角色如何面对爱？",
  "他愿意为谁放弃自由？",
  "若角色必须道歉，他最想向谁说？",
  "他曾羡慕过的生活是什么样的？",
  "角色是否曾想过“如果我从未出生”？",
  "哪一刻让角色产生了改变人生的想法？",
  "若角色只能留下一个记忆，他会选择哪一个？",
  "他最想毁掉的关系是什么？",
  "角色最害怕的未来是什么？",
  "如果角色被迫离开现在的世界，他会带走什么？",
  "他如何面对久别重逢？",
  "若角色可以拥有一个新的名字，他会选什么？",
  "世界对角色最残酷的地方是什么？",
  "他希望别人怎样记住他？",
  "若角色能够说一句“真心话”，他会说什么？",
  "角色曾让自己感到骄傲的瞬间是什么？",
  "若角色必须牺牲自己才能拯救他人，他会选择吗？",
  "他最不愿卷入的事件是什么？",
  "若角色醒来发现一切只是梦，他会松一口气还是恐惧？",
  "如果现在就是角色故事的分岔点，他会往哪条路走？"
];

export default function BigQuestionBox({ onOpen, hasCharacter }) {
  const [promptIndex, setPromptIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setPromptIndex((prev) => (prev + 1) % PROMPTS.length);
        setIsAnimating(false);
      }, 500); // Half of transition time
    }, 12000); // 12 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto my-4 md:my-6 px-4">
      <div
        onClick={() => onOpen(PROMPTS[promptIndex])}
        className="group relative bg-white/80 backdrop-blur-md border-2 border-indigo-100 active:border-indigo-300 md:hover:border-indigo-300 rounded-2xl md:rounded-full min-h-[4rem] md:h-16 flex flex-col md:flex-row items-center px-4 py-3 md:px-8 cursor-pointer shadow-sm active:shadow-md md:hover:shadow-md transition-all duration-300 transform active:scale-[0.98] md:hover:-translate-y-0.5"
      >
        {/* Icon & Text Container */}
        <div className="flex items-center w-full md:w-auto flex-1 overflow-hidden mb-2 md:mb-0">
            {/* Icon */}
            <span className="text-xl md:text-2xl mr-3 md:mr-4 text-indigo-400 group-hover:text-indigo-600 transition-colors shrink-0">
            ✨
            </span>

            {/* Rotating Prompt */}
            <div className="flex-1 overflow-hidden h-6 md:h-full flex items-center relative">
            <span
                className={`text-gray-400 text-sm md:text-lg font-medium transition-all duration-500 w-full truncate ${
                isAnimating
                    ? "opacity-0 translate-y-4"
                    : "opacity-100 translate-y-0"
                }`}
            >
                {PROMPTS[promptIndex]}
            </span>
            </div>
        </div>

        {/* Action Button Visual */}
        <div className="w-full md:w-auto bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs md:text-sm font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all text-center">
          {hasCharacter ? "发布动态" : "创建角色"}
        </div>
      </div>
    </div>
  );
}
