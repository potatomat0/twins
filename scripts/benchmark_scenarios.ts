import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function benchmark() {
    console.log('\n--- SCENARIO BENCHMARK: VIEWER FLOW ---');

    // 1. LOGIN
    const tLoginStart = performance.now();
    const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
        email: 'viewer@test.com',
        password: 'Matkhautwins1!'
    });
    const tLoginEnd = performance.now();
    
    if (authError) {
        console.error('Login failed:', authError.message);
        return;
    }
    console.log(`[Login] Latency: ${(tLoginEnd - tLoginStart).toFixed(2)}ms`);
    const userId = auth.user.id;

    // 2. RECOMMENDATION (Cold)
    const tRecStart = performance.now();
    const { data: recData, error: recError } = await supabase.functions.invoke('recommend-users', {
        body: { 
            userId, 
            useElo: true, 
            useHobbies: true,
            filters: {} 
        } 
    });
    const tRecEnd = performance.now();

    if (recError) {
        console.error('Recommend failed:', recError);
        return;
    }
    console.log(`[Recommend] Latency: ${(tRecEnd - tRecStart).toFixed(2)}ms`);
    console.log(`[Recommend] Server-reported elapsed: ${recData.elapsedMs}ms`);
    
    // Analyze Top 5
    console.log('\n--- TOP 5 RECOMMENDATIONS ---');
    console.log('| Rank | Username | Score | PCA | ELO | Hobby |');
    console.log('|---|---|---|---|---|---|');
    recData.users.slice(0, 5).forEach((u: any, i: number) => {
        console.log(`| ${i+1} | ${u.username.padEnd(10)} | ${u.score.toFixed(3)} | ${u.similarity.toFixed(3)} | ${u.elo_rating} | ${u.hobby_score.toFixed(3)} |`);
    });

    console.log('\n--- BOTTOM 5 RECOMMENDATIONS ---');
    recData.users.slice(-5).forEach((u: any, i: number) => {
        console.log(`| ${recData.users.length - 4 + i} | ${u.username.padEnd(10)} | ${u.score.toFixed(3)} | ${u.similarity.toFixed(3)} | ${u.elo_rating} | ${u.hobby_score.toFixed(3)} |`);
    });

    // 3. INTERACTION (Like Match_PCA)
    const target = recData.users.find((u: any) => u.username === 'Match_PCA');
    if (target) {
        const tLikeStart = performance.now();
        const { data: likeRes, error: likeError } = await supabase.functions.invoke('match-update', {
            body: {
                actorId: userId,
                targetId: target.id,
                outcome: 'like'
            }
        });
        const tLikeEnd = performance.now();
        console.log(`\n[Action: Like] Latency: ${(tLikeEnd - tLikeStart).toFixed(2)}ms`);
        if (!likeError) {
            console.log(`  New ELO: Actor=${likeRes.actor.elo}, Target=${likeRes.target.elo}`);
        }
    }

    // 4. INTERACTION (Skip Match_Hobby)
    const targetSkip = recData.users.find((u: any) => u.username === 'Match_Hobby');
    if (targetSkip) {
        const tSkipStart = performance.now();
        const { data: skipRes, error: skipError } = await supabase.functions.invoke('match-update', {
            body: {
                actorId: userId,
                targetId: targetSkip.id,
                outcome: 'skip'
            }
        });
        const tSkipEnd = performance.now();
        console.log(`[Action: Skip] Latency: ${(tSkipEnd - tSkipStart).toFixed(2)}ms`);
        if (!skipError) {
            console.log(`  New ELO: Actor=${skipRes.actor.elo}, Target=${skipRes.target.elo}`);
        }
    }
}

benchmark();
