-- Fix Quick continuation (2+ seals) and first-payoff count.
-- Do not redefine Daily RRR; Quick delay already uses result_available_at.

CREATE OR REPLACE FUNCTION public.get_mode_payoff_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_admin();
  RETURN jsonb_build_object(
    'quick', (
      SELECT jsonb_build_object(
        'first_seal', count(DISTINCT e.user_id),
        'continued', (
          SELECT count(*) FROM (
            SELECT e2.user_id
            FROM public.entries e2
            JOIN public.marshmallows mq ON mq.id = e2.marshmallow_id
            WHERE e2.sealed_at IS NOT NULL AND mq.play_mode = 'quick'
            GROUP BY e2.user_id
            HAVING count(*) >= 2
          ) q
        ),
        'first_payoff', (
          SELECT count(DISTINCT ro3.user_id)
          FROM public.reveal_opens ro3
          JOIN public.marshmallows mq3 ON mq3.id = ro3.marshmallow_id
          JOIN public.entries e4
            ON e4.user_id = ro3.user_id AND e4.marshmallow_id = ro3.marshmallow_id
          WHERE mq3.play_mode = 'quick' AND e4.sealed_at IS NOT NULL
        ),
        'eligible_reveals', count(*) FILTER (WHERE m.status = 'revealed'),
        'reveal_opens', count(ro.opened_at),
        'avg_sample', (
          SELECT avg(r.total_sealed_votes)
          FROM public.marshmallow_results r
          JOIN public.marshmallows mq ON mq.id = r.marshmallow_id
          WHERE mq.play_mode = 'quick'
        ),
        'median_payoff_seconds', (
          SELECT percentile_cont(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (
              ro2.opened_at - GREATEST(e3.sealed_at, coalesce(m2.result_available_at, ro2.opened_at))
            ))
          )
          FROM public.reveal_opens ro2
          JOIN public.entries e3
            ON e3.user_id = ro2.user_id AND e3.marshmallow_id = ro2.marshmallow_id
          JOIN public.marshmallows m2 ON m2.id = ro2.marshmallow_id
          WHERE m2.play_mode = 'quick' AND e3.sealed_at IS NOT NULL
        )
      )
      FROM public.entries e
      JOIN public.marshmallows m ON m.id = e.marshmallow_id
      LEFT JOIN public.reveal_opens ro
        ON ro.user_id = e.user_id AND ro.marshmallow_id = e.marshmallow_id
      WHERE e.sealed_at IS NOT NULL AND m.play_mode = 'quick'
    ),
    'daily', (
      SELECT jsonb_build_object(
        'seals', count(*),
        'eligible_reveals', count(*) FILTER (WHERE m.status = 'revealed' AND m.cancelled_at IS NULL),
        'reveal_opens', count(ro.opened_at),
        'median_return_delay_seconds', (
          SELECT percentile_cont(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (ro2.opened_at - coalesce(m2.result_available_at, m2.reveals_at)))
          )
          FROM public.reveal_opens ro2
          JOIN public.marshmallows m2 ON m2.id = ro2.marshmallow_id
          WHERE m2.play_mode = 'daily'
        )
      )
      FROM public.entries e
      JOIN public.marshmallows m ON m.id = e.marshmallow_id
      LEFT JOIN public.reveal_opens ro
        ON ro.user_id = e.user_id AND ro.marshmallow_id = e.marshmallow_id
      WHERE e.sealed_at IS NOT NULL AND m.play_mode = 'daily'
    ),
    'live', (
      SELECT jsonb_build_object(
        'seals', count(*),
        'reveal_opens', count(ro.opened_at),
        'eligible_reveals', count(*) FILTER (WHERE m.status = 'revealed' AND m.cancelled_at IS NULL)
      )
      FROM public.entries e
      JOIN public.marshmallows m ON m.id = e.marshmallow_id
      LEFT JOIN public.reveal_opens ro
        ON ro.user_id = e.user_id AND ro.marshmallow_id = e.marshmallow_id
      WHERE e.sealed_at IS NOT NULL AND m.play_mode = 'live'
    )
  );
END;
$$;
