-- IELTS Writing Task 2 Model Answers Migration
-- Adds Band 8 model answers (250-320 words) to IELTS Writing tests
-- These answers are approachable and achievable for students

-- First, update the existing IELTS Test 1 Task 2 with a model answer
UPDATE public.questions
SET transcription = 'There is ongoing debate about whether university students should have complete freedom in choosing their subjects or be limited to practical fields like science and technology. In my view, while vocational relevance is important, students should ultimately have the freedom to pursue their interests.

Those who support restricting subject choices argue that higher education should prepare students for the job market. In an increasingly competitive world, degrees in STEM subjects often lead to better employment prospects and higher salaries. From a national perspective, countries need skilled professionals in technical fields to drive economic growth and innovation. Governments invest heavily in universities, so it seems reasonable to expect graduates who can contribute to society''s practical needs.

However, I believe that allowing students to choose freely brings significant benefits. Firstly, students who study subjects they are passionate about tend to be more motivated and perform better academically. A student forced into engineering when they love literature will likely struggle and may not reach their potential. Secondly, society needs professionals in all fields, including arts, humanities, and social sciences. Teachers, historians, writers, and psychologists all play vital roles in a functioning society. Finally, many successful people have built careers using skills from unexpected academic backgrounds, as creativity and critical thinking are transferable across industries.

In conclusion, while I understand the appeal of prioritising practical subjects, I firmly believe that giving students freedom of choice leads to better outcomes for both individuals and society. The key is to provide proper career guidance so students make informed decisions.'
WHERE test_id IN (
    SELECT id FROM public.tests 
    WHERE test_name = 'IELTS Test 1' AND test_type = 'IELTS' AND module = 'Writing'
)
AND part_number = 2;

-- Update the existing IELTS Test 1 Task 1 with a model answer for the electrical appliances chart
UPDATE public.questions
SET transcription = 'The chart illustrates how ownership of electrical appliances and time spent on housework changed in households in one country from 1920 to 2019.

Overall, ownership of all three appliances increased dramatically over the century, while the time devoted to household chores decreased substantially. By 2019, washing machines and refrigerators had become nearly universal.

In 1920, only around 40% of homes had a washing machine, but this figure rose steadily to reach almost 100% by the 1980s and remained stable thereafter. Refrigerator ownership started lower at approximately 5% in 1920 but grew even more rapidly, reaching near-universal adoption by 1980. Vacuum cleaners followed a similar pattern, climbing from about 30% in 1920 to around 95% by 2019.

Regarding housework time, residents spent approximately 50 hours per week on domestic tasks in 1920. This figure declined sharply as appliance ownership increased, falling to about 20 hours by 1960. The downward trend continued more gradually after this point, reaching roughly 10 hours per week by 2019.

In summary, the widespread adoption of labour-saving appliances clearly correlates with the dramatic reduction in housework time over the past century.'
WHERE test_id IN (
    SELECT id FROM public.tests 
    WHERE test_name = 'IELTS Test 1' AND test_type = 'IELTS' AND module = 'Writing'
)
AND part_number = 1;

-- Create additional IELTS Writing tests with varied Task 2 topics and model answers

-- Test 2: Technology and Social Interaction (Academic)
INSERT INTO public.tests (test_name, test_type, module, skill_category, test_subtype)
VALUES ('IELTS Academic Writing Test 2', 'IELTS', 'Writing', 'Writing', 'Academic');

DO $$
DECLARE
    test_uuid UUID;
BEGIN
    SELECT id INTO test_uuid FROM public.tests WHERE test_name = 'IELTS Academic Writing Test 2';
    
    -- Task 1: Bar Chart (Australian Telephone Calls - the one user has)
    INSERT INTO public.questions (
        test_id, part_number, question_number_in_part, question_type, question_text,
        passage_text, image_url, transcription
    ) VALUES (
        test_uuid, 1, 1, 'Task 1',
        'Task 1 - Data Description',
        'The bar chart below shows the total number of minutes (in billions) of telephone calls in Australia, divided into three categories, from 2001-2008.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.',
        'https://ielts-simon.com/.a/6a0120a5bb05d8970c01b8d2b2d6ce970c-800wi',
        'The bar chart compares the amount of time spent on three types of telephone calls in Australia between 2001 and 2008.

Overall, local calls were the most popular type throughout the period, although their usage fluctuated. Both national/international calls and mobile calls saw steady increases, with mobiles showing the most dramatic growth.

In 2001, local calls stood at around 72 billion minutes, far exceeding national and international calls at 38 billion and mobiles at just 2 billion. Local call usage rose steadily to reach a peak of 90 billion minutes in 2005, before falling back to the 2001 level of 72 billion by 2008.

In contrast, the other two categories exhibited continuous upward trends. National and international calls grew gradually from 38 billion to 61 billion minutes over the period. Mobile calls started from a very low base of 2 billion but surged significantly, reaching 46 billion minutes by 2008, narrowing the gap with fixed-line categories considerably.'
    );
    
    -- Task 2: Technology and Social Interaction
    INSERT INTO public.questions (
        test_id, part_number, question_number_in_part, question_type, question_text,
        passage_text, transcription
    ) VALUES (
        test_uuid, 2, 1, 'Task 2',
        'Task 2 - Essay Writing',
        'Some people believe that social media and smartphones have negatively affected young people''s ability to communicate face-to-face. Others think technology has simply changed how we interact rather than damaged communication skills.

Discuss both these views and give your own opinion.

Write at least 250 words.',
        'The rise of digital communication has sparked debate about its impact on young people''s interpersonal skills. While some argue that technology has harmed face-to-face communication, others believe it has simply evolved. I believe the reality lies somewhere in between.

Those who criticise technology point to observable changes in social behaviour. Many young people now find it awkward to make phone calls or hold extended conversations without checking their devices. Research suggests that excessive screen time may reduce empathy and the ability to read non-verbal cues. Furthermore, the convenience of texting means fewer opportunities to practice verbal communication skills that are essential in professional and personal settings.

However, technology supporters argue that communication has simply transformed rather than deteriorated. Digital platforms allow introverts to express themselves more confidently and help people maintain relationships across distances. Many young people demonstrate sophisticated communication skills through creating content, managing online communities, and navigating complex social dynamics on multiple platforms. These are valuable skills for the modern workplace.

In my opinion, technology is neither wholly beneficial nor harmful. The key factor is how it is used. When digital communication supplements rather than replaces face-to-face interaction, young people can develop both traditional and modern communication skills. Parents and educators should encourage balanced technology use and create opportunities for in-person socialising.

To conclude, while concerns about technology''s impact are valid, the solution is not to reject it but to integrate it thoughtfully into young people''s social development.'
    );
END $$;

-- Test 3: Environment and Individual Responsibility (Academic)
INSERT INTO public.tests (test_name, test_type, module, skill_category, test_subtype)
VALUES ('IELTS Academic Writing Test 3', 'IELTS', 'Writing', 'Writing', 'Academic');

DO $$
DECLARE
    test_uuid UUID;
BEGIN
    SELECT id INTO test_uuid FROM public.tests WHERE test_name = 'IELTS Academic Writing Test 3';
    
    -- Task 1: Process Diagram (Generic placeholder)
    INSERT INTO public.questions (
        test_id, part_number, question_number_in_part, question_type, question_text,
        passage_text, transcription
    ) VALUES (
        test_uuid, 1, 1, 'Task 1',
        'Task 1 - Process Description',
        'The diagram below shows the process of recycling plastic bottles.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.',
        'The diagram illustrates the key stages involved in recycling plastic bottles, from collection to the production of new products.

The process begins when consumers deposit used plastic bottles into recycling bins. These bottles are then collected by trucks and transported to a recycling facility. At the facility, the bottles are first sorted by type and colour, as different plastics require different processing methods.

Once sorted, the bottles are thoroughly washed to remove any contaminants such as labels, caps, and residue. They are then shredded into small pieces called flakes. These flakes undergo another washing and drying phase before being melted down.

The melted plastic is formed into small pellets, which can be sold to manufacturers. These pellets serve as raw material for producing new products such as clothing fibres, carpets, bottles, and packaging materials.

In summary, plastic bottle recycling is a multi-stage process that transforms waste into usable raw materials through collection, sorting, cleaning, shredding, and pelletising.'
    );
    
    -- Task 2: Environment and Individual Responsibility
    INSERT INTO public.questions (
        test_id, part_number, question_number_in_part, question_type, question_text,
        passage_text, transcription
    ) VALUES (
        test_uuid, 2, 1, 'Task 2',
        'Task 2 - Essay Writing',
        'Some people believe that individuals can do little to protect the environment and that governments and large companies must take action. Others think that individuals can make a real difference.

Discuss both views and give your own opinion.

Write at least 250 words.',
        'Environmental protection is often framed as a responsibility of governments and corporations, but there is growing recognition that individuals also play a crucial role. I believe that while systemic changes are essential, personal actions remain meaningful and should not be dismissed.

Those who emphasise government and corporate responsibility make valid points. Climate change and pollution are largely driven by industrial activities, transport systems, and energy production that individuals cannot directly control. A single person recycling or reducing their carbon footprint has minimal impact compared to a factory changing its practices. Moreover, governments have the power to implement regulations, invest in renewable energy, and incentivise sustainable business practices at a scale that individual actions cannot match.

However, dismissing individual responsibility ignores several important factors. Firstly, consumer choices collectively drive market demand. When enough people choose sustainable products, companies respond by changing their offerings. Secondly, individuals who adopt environmentally conscious habits often become advocates who influence their communities and support environmental policies. Finally, personal actions build habits and awareness that can lead to broader social change over time.

In my view, environmental protection requires action at all levels. Individuals should not use the scale of the problem as an excuse for inaction, nor should they believe that personal lifestyle changes alone are sufficient. The most effective approach combines individual consciousness with pressure on governments and corporations to implement meaningful systemic changes.

To conclude, everyone has a role to play in protecting our planet, from households to boardrooms to parliaments.'
    );
END $$;

-- Test 4: Education - Traditional vs Modern Methods (Academic)
INSERT INTO public.tests (test_name, test_type, module, skill_category, test_subtype)
VALUES ('IELTS Academic Writing Test 4', 'IELTS', 'Writing', 'Writing', 'Academic');

DO $$
DECLARE
    test_uuid UUID;
BEGIN
    SELECT id INTO test_uuid FROM public.tests WHERE test_name = 'IELTS Academic Writing Test 4';
    
    INSERT INTO public.questions (
        test_id, part_number, question_number_in_part, question_type, question_text,
        passage_text, transcription
    ) VALUES (
        test_uuid, 1, 1, 'Task 1',
        'Task 1 - Data Description',
        'The pie charts below show the main reasons why agricultural land becomes less productive. The table shows how these causes affected three regions of the world during the 1990s.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.',
        'The pie charts and table illustrate the primary causes of land degradation globally and across three regions during the 1990s.

Globally, overgrazing was the leading cause of land degradation at 35%, followed closely by deforestation at 30%. Over-cultivation accounted for 28%, while other factors made up the remaining 7%.

The regional breakdown reveals significant variations. In North America, over-cultivation was the dominant issue, causing degradation to 3.3% of total land, whereas deforestation had minimal impact. Europe presented a contrasting picture, with deforestation affecting 9.8% of land, the highest proportion of any region or cause shown.

Oceania showed more balanced figures, with overgrazing and deforestation each affecting around 11-12% of land, while over-cultivation impacted only 0.2%. This suggests that agricultural practices in Oceania differ substantially from those in North America.

In summary, while overgrazing is the leading global cause of land degradation, the relative importance of each factor varies considerably between regions.'
    );
    
    INSERT INTO public.questions (
        test_id, part_number, question_number_in_part, question_type, question_text,
        passage_text, transcription
    ) VALUES (
        test_uuid, 2, 1, 'Task 2',
        'Task 2 - Essay Writing',
        'Some people think that traditional teaching methods are more effective than modern approaches such as online learning and technology in the classroom. Others believe that modern methods have clear advantages.

Discuss both views and give your own opinion.

Write at least 250 words.',
        'The debate between traditional classroom teaching and modern technology-based approaches continues to divide educators and parents. While both methods have merits, I believe that a blended approach offers the best outcomes for students.

Supporters of traditional teaching emphasise the importance of direct human interaction. A skilled teacher can read the room, adapt explanations when students look confused, and provide immediate personal feedback. The structured environment of a classroom also helps students develop discipline and social skills. Many successful education systems, particularly in East Asia, still rely heavily on direct instruction and have produced excellent academic results.

On the other hand, technology-based learning offers unique advantages. Online platforms can personalise content to each student''s level and pace, providing additional practice where needed. Students can access high-quality lessons from expert teachers worldwide and review material as many times as necessary. Technology also prepares students for a digital workplace and develops important skills like self-directed learning and digital literacy.

In my opinion, the most effective approach combines the strengths of both methods. Technology can handle routine practice and content delivery efficiently, freeing teachers to focus on discussion, problem-solving, and providing the emotional support that only humans can offer. The recent shift to online learning during the pandemic showed both the potential and limitations of purely digital education.

To conclude, rather than choosing between traditional and modern methods, educators should thoughtfully integrate both to create engaging and effective learning experiences.'
    );
END $$;

-- Test 5: Work-Life Balance (General Training)
INSERT INTO public.tests (test_name, test_type, module, skill_category, test_subtype)
VALUES ('IELTS General Writing Test 1', 'IELTS', 'Writing', 'Writing', 'General');

DO $$
DECLARE
    test_uuid UUID;
BEGIN
    SELECT id INTO test_uuid FROM public.tests WHERE test_name = 'IELTS General Writing Test 1';
    
    -- Task 1: Letter
    INSERT INTO public.questions (
        test_id, part_number, question_number_in_part, question_type, question_text,
        passage_text, transcription
    ) VALUES (
        test_uuid, 1, 1, 'Task 1',
        'Task 1 - Letter Writing',
        'You recently attended a training course for your work. Your manager has asked you to write a report about the course.

Write a letter to your manager. In your letter:
- describe the training course
- explain what you learned from the course
- suggest how the training could be useful for other employees

Write at least 150 words.',
        'Dear Mr Johnson,

I am writing to report on the Customer Service Excellence training course I attended last week at the Central Conference Centre.

The two-day course covered several key areas including effective communication techniques, handling difficult customers, and using our new CRM software. The trainer, Ms Sarah Chen, is an experienced consultant who used a combination of presentations, role-play exercises, and case studies to make the content engaging and practical.

I found the session on de-escalation strategies particularly valuable. I learned how to remain calm when dealing with frustrated customers and how to use specific phrases that acknowledge their concerns while moving toward solutions. The hands-on practice with the CRM system also increased my confidence in using features I had previously avoided.

I believe this training would benefit our entire customer service team. I would recommend scheduling group sessions so colleagues can practice the techniques together. Perhaps we could also arrange a follow-up workshop in three months to reinforce the learning.

Please let me know if you would like further details about the course content.

Yours sincerely,
[Your name]'
    );
    
    -- Task 2: Work-Life Balance
    INSERT INTO public.questions (
        test_id, part_number, question_number_in_part, question_type, question_text,
        passage_text, transcription
    ) VALUES (
        test_uuid, 2, 1, 'Task 2',
        'Task 2 - Essay Writing',
        'Many people today find it difficult to balance the demands of work with their family and personal life.

What are the causes of this problem? What solutions can you suggest?

Write at least 250 words.',
        'Achieving a healthy balance between professional responsibilities and personal life has become increasingly challenging in the modern world. This essay will examine the main causes of this problem and propose some practical solutions.

Several factors contribute to work-life imbalance. Firstly, technology has blurred the boundaries between work and home. Smartphones and laptops mean employees are expected to be available outside office hours, making it difficult to truly disconnect. Secondly, economic pressures force many people to work longer hours or take multiple jobs just to meet basic living costs. Finally, workplace cultures in many industries glorify overwork, creating pressure to sacrifice personal time to demonstrate commitment and advance careers.

Fortunately, there are several ways to address this issue. Employers can implement clear policies about after-hours communication and encourage managers to respect boundaries. Some countries have introduced "right to disconnect" laws, which prohibit employers from penalising workers who do not respond to messages outside working hours. Individuals can also take steps to protect their personal time by setting firm boundaries, scheduling regular family activities, and learning to say no to unnecessary commitments.

Governments should also consider addressing the economic factors that force people into overwork. Policies that ensure living wages, affordable housing, and accessible childcare would reduce the financial pressure that drives excessive working hours.

In conclusion, while the causes of work-life imbalance are complex, a combination of employer policies, legislation, and personal boundaries can help people reclaim time for the parts of life that matter most.'
    );
END $$;
