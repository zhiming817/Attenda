#[test_only]
module attenda::event_registry_tests {
    use attenda::event_registry::{Self, EventInfo};
    use sui::test_scenario;

    const ORGANIZER: address = @0xA;
    const USER: address = @0xB;

    #[test]
    fun test_create_event() {
        let mut scenario = test_scenario::begin(ORGANIZER);

        // 创建活动
        {
            let walrus_ref = b"walrus://test-event-blob-id";
            let capacity = 100;
            event_registry::create_event(walrus_ref, capacity, scenario.ctx());
        };

        // 验证活动已创建
        scenario.next_tx(ORGANIZER);
        {
            let event = scenario.take_shared<EventInfo>();
            
            assert!(event_registry::get_organizer(&event) == ORGANIZER, 0);
            assert!(event_registry::get_capacity(&event) == 100, 1);
            assert!(event_registry::get_tickets_sold(&event) == 0, 2);
            assert!(event_registry::is_active(&event), 3);

            test_scenario::return_shared(event);
        };

        scenario.end();
    }

    #[test]
    fun test_update_event() {
        let mut scenario = test_scenario::begin(ORGANIZER);

        // 创建活动
        {
            event_registry::create_event(b"walrus://blob1", 100, scenario.ctx());
        };

        // 更新活动
        scenario.next_tx(ORGANIZER);
        {
            let mut event = scenario.take_shared<EventInfo>();
            event_registry::update_event(
                &mut event,
                b"walrus://blob2",
                200,
                scenario.ctx()
            );
            
            assert!(event_registry::get_capacity(&event) == 200, 0);
            
            test_scenario::return_shared(event);
        };

        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = event_registry::ERR_NOT_ORGANIZER)]
    fun test_update_event_unauthorized() {
        let mut scenario = test_scenario::begin(ORGANIZER);

        // 创建活动
        {
            event_registry::create_event(b"walrus://blob1", 100, scenario.ctx());
        };

        // 非组织者尝试更新（应失败）
        scenario.next_tx(USER);
        {
            let mut event = scenario.take_shared<EventInfo>();
            event_registry::update_event(
                &mut event,
                b"walrus://blob2",
                200,
                scenario.ctx()
            );
            test_scenario::return_shared(event);
        };

        scenario.end();
    }

    #[test]
    fun test_set_status() {
        let mut scenario = test_scenario::begin(ORGANIZER);

        {
            event_registry::create_event(b"walrus://blob", 100, scenario.ctx());
        };

        // 暂停活动
        scenario.next_tx(ORGANIZER);
        {
            let mut event = scenario.take_shared<EventInfo>();
            event_registry::set_status(&mut event, 1, scenario.ctx()); // PAUSED
            assert!(event_registry::get_status(&event) == 1, 0);
            test_scenario::return_shared(event);
        };

        scenario.end();
    }
}
