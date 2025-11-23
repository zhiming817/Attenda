/// Module: Attendance
/// 出席记录与 Attendance NFT 铸造
module attenda::attendance {
    use sui::event;
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};
    use attenda::ticket_nft::{Self, Ticket};
    use attenda::event_registry::{Self, EventInfo};

    /// 错误码
    const ERR_NOT_AUTHORIZED: u64 = 3000;
    const ERR_TICKET_INVALID: u64 = 3002;
    const ERR_NOT_EVENT_ORGANIZER: u64 = 3004;
    const ERR_TICKET_ALREADY_USED: u64 = 3005;

    /// 已使用票据记录表（全局共享对象）
    public struct UsedTicketsRegistry has key {
        id: UID,
        used_tickets: sui::table::Table<address, bool>,
    }

    /// 初始化函数（部署时调用一次）
    fun init(ctx: &mut TxContext) {
        let registry = UsedTicketsRegistry {
            id: sui::object::new(ctx),
            used_tickets: sui::table::new(ctx),
        };
        sui::transfer::share_object(registry);
    }

    /// 出席记录结构体
    public struct Attendance has key, store {
        id: UID,
        event_id: address,
        user: address,
        ticket_id: std::option::Option<address>,
        check_in_time: u64,
        verification_method: u8,
        verification_code: String,
        checked_in_by: address,
        is_soulbound: bool,
    }

    /// 出席记录创建事件
    public struct AttendanceRecorded has copy, drop {
        attendance_id: address,
        event_id: address,
        user: address,
        ticket_id: std::option::Option<address>,
        verification_method: u8,
        verification_code: String,
        checked_in_by: address,
    }

    /// Attendance NFT 铸造事件
    public struct AttendanceNFTMinted has copy, drop {
        attendance_id: address,
        user: address,
        is_soulbound: bool,
    }

    /// 记录出席（由门禁系统/验证者调用）
    public entry fun record_attendance(
        registry: &mut UsedTicketsRegistry,
        event: &EventInfo,
        user: address,
        ticket: &Ticket,
        verification_method: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        
        // 验证调用者是活动组织者
        assert!(event_registry::is_organizer(event, sender), ERR_NOT_EVENT_ORGANIZER);
        
        // 验证门票有效性
        assert!(ticket_nft::is_valid(ticket), ERR_TICKET_INVALID);
        assert!(ticket_nft::get_owner(ticket) == user, ERR_TICKET_INVALID);
        
        let event_id = sui::object::id_to_address(&sui::object::id(event));
        assert!(ticket_nft::get_event_id(ticket) == event_id, ERR_TICKET_INVALID);

        let ticket_addr = sui::object::id_to_address(&sui::object::id(ticket));
        
        // 检查票据是否已使用
        assert!(!sui::table::contains(&registry.used_tickets, ticket_addr), ERR_TICKET_ALREADY_USED);
        
        // 标记门票已用（记录到全局表中）
        sui::table::add(&mut registry.used_tickets, ticket_addr, true);
        let now_ms = clock::timestamp_ms(clock);
        
        let attendance = Attendance {
            id: sui::object::new(ctx),
            event_id,
            user,
            ticket_id: std::option::some(ticket_addr),
            check_in_time: now_ms,
            verification_method,
            verification_code: string::utf8(b""),
            checked_in_by: sender,
            is_soulbound: false,
        };

        let attendance_id = sui::object::uid_to_address(&attendance.id);

        event::emit(AttendanceRecorded {
            attendance_id,
            event_id,
            user,
            ticket_id: attendance.ticket_id,
            verification_method,
            verification_code: attendance.verification_code,
            checked_in_by: sender,
        });

        sui::transfer::public_transfer(attendance, user);
    }

    /// 记录出席（带验证码验证）- 用于二维码扫描签到
    /// 注意：此版本只接收 ticket_id，不需要票据对象引用
    /// 这样组织者可以在不拥有票据的情况下完成签到
    public entry fun record_attendance_with_verification(
        registry: &mut UsedTicketsRegistry,
        event: &EventInfo,
        user: address,
        ticket_id: address,
        verification_code: vector<u8>,
        verification_method: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        
        // 验证调用者是活动组织者
        assert!(event_registry::is_organizer(event, sender), ERR_NOT_EVENT_ORGANIZER);
        
        // 检查票据是否已使用
        assert!(!sui::table::contains(&registry.used_tickets, ticket_id), ERR_TICKET_ALREADY_USED);
        
        // 标记门票已用（记录到全局表中）
        // 注意：我们信任组织者和前端验证逻辑
        // 前端已经验证了：
        // 1. 票据存在且属于正确的活动
        // 2. 票据所有者是 user 地址
        // 3. 验证码匹配
        sui::table::add(&mut registry.used_tickets, ticket_id, true);
        
        let event_id = sui::object::id_to_address(&sui::object::id(event));
        let now_ms = clock::timestamp_ms(clock);
        let verification_code_str = string::utf8(verification_code);
        
        let attendance = Attendance {
            id: sui::object::new(ctx),
            event_id,
            user,
            ticket_id: std::option::some(ticket_id),
            check_in_time: now_ms,
            verification_method,
            verification_code: verification_code_str,
            checked_in_by: sender,
            is_soulbound: false,
        };

        let attendance_id = sui::object::uid_to_address(&attendance.id);

        event::emit(AttendanceRecorded {
            attendance_id,
            event_id,
            user,
            ticket_id: attendance.ticket_id,
            verification_method,
            verification_code: verification_code_str,
            checked_in_by: sender,
        });

        sui::transfer::public_transfer(attendance, user);
    }

    /// 无门票出席记录（特殊情况）
    public entry fun record_attendance_without_ticket(
        event: &EventInfo,
        user: address,
        verification_method: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        
        // 验证调用者是活动组织者
        assert!(event_registry::is_organizer(event, sender), ERR_NOT_EVENT_ORGANIZER);
        
        let event_id = sui::object::id_to_address(&sui::object::id(event));
        let now_ms = clock::timestamp_ms(clock);
        
        let attendance = Attendance {
            id: sui::object::new(ctx),
            event_id,
            user,
            ticket_id: std::option::none(),
            check_in_time: now_ms,
            verification_method,
            verification_code: string::utf8(b""),
            checked_in_by: sender,
            is_soulbound: false,
        };

        let attendance_id = sui::object::uid_to_address(&attendance.id);

        event::emit(AttendanceRecorded {
            attendance_id,
            event_id,
            user,
            ticket_id: std::option::none(),
            verification_method,
            verification_code: string::utf8(b""),
            checked_in_by: sender,
        });

        sui::transfer::public_transfer(attendance, user);
    }

    /// 将出席记录铸造为 Soulbound NFT
    public entry fun make_soulbound(
        attendance: &mut Attendance,
        ctx: &mut TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        assert!(attendance.user == sender, ERR_NOT_AUTHORIZED);

        attendance.is_soulbound = true;

        let attendance_id = sui::object::uid_to_address(&attendance.id);
        event::emit(AttendanceNFTMinted {
            attendance_id,
            user: attendance.user,
            is_soulbound: true,
        });
    }

    /// 只读访问器
    public fun get_event_id(attendance: &Attendance): address {
        attendance.event_id
    }

    public fun get_user(attendance: &Attendance): address {
        attendance.user
    }

    public fun get_check_in_time(attendance: &Attendance): u64 {
        attendance.check_in_time
    }

    public fun is_soulbound(attendance: &Attendance): bool {
        attendance.is_soulbound
    }

    public fun get_verification_code(attendance: &Attendance): String {
        attendance.verification_code
    }

    public fun get_checked_in_by(attendance: &Attendance): address {
        attendance.checked_in_by
    }
}
