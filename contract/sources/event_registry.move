/// Module: EventRegistry
/// 管理活动索引、状态与组织者权限
module attenda::event_registry {
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use std::string::{Self, String};
    use attenda::ticket_seal;

    /// 活动状态枚举
    const STATUS_ACTIVE: u8 = 0;
    const STATUS_CLOSED: u8 = 2;
    const STATUS_CANCELLED: u8 = 3;

    /// 错误码
    const ERR_NOT_ORGANIZER: u64 = 1000;
    const ERR_EVENT_CLOSED: u64 = 1001;
    const ERR_INVALID_STATUS: u64 = 1002;
    const ERR_CAPACITY_FULL: u64 = 1003;

    /// 活动信息结构体
    public struct EventInfo has key, store {
        id: UID,
        organizer: address,
        walrus_blob_id: String,
        capacity: u64,
        num_tickets_sold: u64,
        status: u8,
        created_at: u64,
        updated_at: u64,
        /// 记录已注册的参与者
        attendees: Table<address, bool>,
        /// Seal 访问策略 ID
        policy_id: ID,
        /// PolicyCap 对象 ID（用于前端查询）
        policy_cap_id: ID,
    }

    /// 活动创建事件
    public struct EventCreated has copy, drop {
        event_id: address,
        organizer: address,
        walrus_blob_id: String,
        capacity: u64,
    }

    /// 活动更新事件
    public struct EventUpdated has copy, drop {
        event_id: address,
        updated_by: address,
    }

    /// 活动状态变更事件
    public struct EventStatusChanged has copy, drop {
        event_id: address,
        old_status: u8,
        new_status: u8,
        changed_by: address,
    }

    /// 创建活动
    public entry fun create_event(
        walrus_blob_id: vector<u8>,
        capacity: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let organizer = tx_context::sender(ctx);
        let now_ms = clock::timestamp_ms(clock);
        
        // 先创建临时 UID 以获取 event_id
        let uid = object::new(ctx);
        let event_id = object::uid_to_address(&uid);
        
        // 创建 Seal 访问策略
        let policy_cap = ticket_seal::create_policy(event_id, ctx);
        let policy_id = ticket_seal::get_policy_id(&policy_cap);
        let policy_cap_id = object::id(&policy_cap);
        
        let event_info = EventInfo {
            id: uid,
            organizer,
            walrus_blob_id: string::utf8(walrus_blob_id),
            capacity,
            num_tickets_sold: 0,
            status: STATUS_ACTIVE,
            created_at: now_ms,
            updated_at: now_ms,
            attendees: table::new(ctx),
            policy_id,
            policy_cap_id,
        };
        
        event::emit(EventCreated {
            event_id,
            organizer,
            walrus_blob_id: event_info.walrus_blob_id,
            capacity,
        });
        
        // 将 PolicyCap 转移给组织者
        transfer::public_transfer(policy_cap, organizer);
        transfer::share_object(event_info);
    }

    /// 更新活动（仅组织者可调用）
    public entry fun update_event(
        event: &mut EventInfo,
        new_walrus_blob_id: vector<u8>,
        new_capacity: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == event.organizer, ERR_NOT_ORGANIZER);
        assert!(event.status != STATUS_CLOSED && event.status != STATUS_CANCELLED, ERR_EVENT_CLOSED);

        event.walrus_blob_id = string::utf8(new_walrus_blob_id);
        event.capacity = new_capacity;
        event.updated_at = clock::timestamp_ms(clock);

        let event_id = object::uid_to_address(&event.id);
        event::emit(EventUpdated {
            event_id,
            updated_by: sender,
        });
    }

    /// 设置活动状态
    public entry fun set_status(
        event: &mut EventInfo,
        new_status: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == event.organizer, ERR_NOT_ORGANIZER);
        assert!(new_status <= STATUS_CANCELLED, ERR_INVALID_STATUS);

        let old_status = event.status;
        event.status = new_status;
        event.updated_at = clock::timestamp_ms(clock);

        let event_id = object::uid_to_address(&event.id);
        event::emit(EventStatusChanged {
            event_id,
            old_status,
            new_status,
            changed_by: sender,
        });
    }

    /// 增加已售票数（仅由 TicketNFT 模块调用）
    public(package) fun increment_tickets_sold(event: &mut EventInfo) {
        assert!(event.num_tickets_sold < event.capacity, ERR_CAPACITY_FULL);
        event.num_tickets_sold = event.num_tickets_sold + 1;
    }

    /// 检查用户是否已注册
    public(package) fun has_registered(event: &EventInfo, user: address): bool {
        table::contains(&event.attendees, user)
    }

    /// 标记用户已注册
    public(package) fun mark_registered(event: &mut EventInfo, user: address) {
        table::add(&mut event.attendees, user, true);
    }

    /// 获取活动信息（只读）
    public fun get_organizer(event: &EventInfo): address {
        event.organizer
    }

    public fun get_capacity(event: &EventInfo): u64 {
        event.capacity
    }

    public fun get_tickets_sold(event: &EventInfo): u64 {
        event.num_tickets_sold
    }

    public fun get_status(event: &EventInfo): u8 {
        event.status
    }

    public fun is_active(event: &EventInfo): bool {
        event.status == STATUS_ACTIVE
    }

    public fun get_policy_id(event: &EventInfo): ID {
        event.policy_id
    }

    public fun get_policy_cap_id(event: &EventInfo): ID {
        event.policy_cap_id
    }

    /// 检查地址是否为活动组织者
    public fun is_organizer(event: &EventInfo, addr: address): bool {
        event.organizer == addr
    }
}
