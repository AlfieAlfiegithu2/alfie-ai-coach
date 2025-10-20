-- Create IELTS Test 1 in the unified system
INSERT INTO public.tests (test_name, test_type, module, skill_category)
VALUES ('IELTS Test 1', 'IELTS', 'Writing', 'Writing');

-- Get the test ID for the questions
DO $$
DECLARE
    test_uuid UUID;
BEGIN
    SELECT id INTO test_uuid FROM public.tests WHERE test_name = 'IELTS Test 1' AND test_type = 'IELTS' AND module = 'Writing';
    
    -- Insert Task 1 question
    INSERT INTO public.questions (
        test_id, 
        part_number, 
        question_number_in_part, 
        question_type, 
        question_text,
        correct_answer,
        image_url
    ) VALUES (
        test_uuid,
        1,
        1,
        'Task 1',
        'The chart below shows the changes in ownership of electrical appliances and amount of time spent doing housework in households in one country between 1920 and 2019.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.',
        'Task 1 Response',
        '/lovable-uploads/d1e4986a-bac3-4e37-9768-6cada79fb4a4.png'
    );
    
    -- Insert Task 2 question  
    INSERT INTO public.questions (
        test_id,
        part_number,
        question_number_in_part, 
        question_type,
        question_text,
        correct_answer
    ) VALUES (
        test_uuid,
        2,
        1,
        'Task 2',
        'Some people think that all university students should study whatever they like. Others believe that they should only be allowed to study subjects that will be useful in the future, such as those related to science and technology.

Discuss both these views and give your own opinion.

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.',
        'Task 2 Response'
    );
END $$;