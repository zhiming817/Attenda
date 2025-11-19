/// Module: Attendance
/// 出席记录与 Attendance NFT 铸造
module attenda::attendance {
    use sui::event;
    use attenda::ticket_nft::{Self, Ticket};

    /// 错误码
    const ERR_NOT_AUTHORIZED: u64 = 3000;
    const ERR_TICKET_INVALID: u64 = 3002;

    /// 出席记录结构体
    public struct Attendance has key, store {
        id: UID,
        event_id: address,
        user: address,
        ticket_id: std::option::Option<address>,
        check_in_time: u64,
        verification_method: u8,
        is_soulbound: bool,
    }

    /// 出席记录创建事件
    public struct AttendanceRecorded has copy, drop {
        attendance_id: address,
        event_id: address,
        user: address,
        ticket_id: std::option::Option<address>,
        verification_method: u8,
    }

    /// Attendance NFT 铸造事件
    public struct AttendanceNFTMinted has copy, drop {
        attendance_id: address,
        user: address,
        is_soulbound: bool,
    }

    /// 记录出席（由门禁系统/验证者调用）
    public entry fun record_attendance(
        event_id: address,
        user: address,
        ticket: &mut Ticket,
        verification_method: u8,
        ctx: &mut TxContext
    ) {
        // 验证门票有效性
        assert!(ticket_nft::is_valid(ticket), ERR_TICKET_INVALID);
        assert!(ticket_nft::get_owner(ticket) == user, ERR_TICKET_INVALID);
        assert!(ticket_nft::get_event_id(ticket) == event_id, ERR_TICKET_INVALID);

        // 标记门票已用
        ticket_nft::mark_used(ticket, ctx);

        let ticket_addr = sui::object::id_to_address(&sui::object::id(ticket));
        
        let attendance = Attendance {
            id: sui::object::new(ctx),
            event_id,
            user,
            ticket_id: std::option::some(ticket_addr),
            check_in_time: sui::tx_context::epoch(ctx),
            verification_method,
            is_soulbound: false,
        };

        let attendance_id = sui::object::uid_to_address(&attendance.id);

        event::emit(AttendanceRecorded {
            attendance_id,
            event_id,
            user,
            ticket_id: attendance.ticket_id,
            verification_method,
        });

        sui::transfer::public_transfer(attendance, user);
    }

    /// 无门票出席记录（特殊情况）
    public entry fun record_attendance_without_ticket(
        event_id: address,
        user: address,
        verification_method: u8,
        ctx: &mut TxContext
    ) {
        let _sender = sui::tx_context::sender(ctx);
        // 在实际实现中，这里应检查 _sender 是否有权限（如组织者或验证者）
        
        let attendance = Attendance {
            id: sui::object::new(ctx),
            event_id,
            user,
            ticket_id: std::option::none(),
            check_in_time: sui::tx_context::epoch(ctx),
            verification_method,
            is_soulbound: false,
        };

        let attendance_id = sui::object::uid_to_address(&attendance.id);

        event::emit(AttendanceRecorded {
            attendance_id,
            event_id,
            user,
            ticket_id: option::none(),
            verification_method,
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
}
