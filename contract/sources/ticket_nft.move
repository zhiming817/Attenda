/// Module: TicketNFT
/// 门票 NFT 铸造、转移与状态管理
module attenda::ticket_nft {
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::display;
    use sui::package;
    use sui::url::{Self, Url};
    use std::string::{Self, String};
    use attenda::event_registry::{Self, EventInfo};
    use attenda::ticket_seal::{Self, TicketPolicy, PolicyCap};

    /// One-Time-Witness for Display
    public struct TICKET_NFT has drop {}

    /// 门票状态
    const STATUS_VALID: u8 = 0;
    const STATUS_USED: u8 = 1;
    const STATUS_REVOKED: u8 = 2;

    /// 错误码
    const ERR_NOT_OWNER: u64 = 2000;
    const ERR_TICKET_INVALID: u64 = 2001;
    const ERR_ALREADY_USED: u64 = 2003;
    const ERR_ALREADY_REGISTERED: u64 = 2004;

    /// 门票 NFT 结构体
    public struct Ticket has key, store {
        id: UID,
        event_id: address,
        owner: address,
        walrus_blob_ref: String,
        encrypted_meta_hash: vector<u8>,
        ticket_type: u8,
        status: u8,
        created_at: u64,
        /// 用于 Display
        name: String,
        description: String,
        url: Url,
    }

    /// 门票铸造事件
    public struct TicketMinted has copy, drop {
        ticket_id: address,
        event_id: address,
        owner: address,
        ticket_type: u8,
    }

    /// 门票转移事件
    public struct TicketTransferred has copy, drop {
        ticket_id: address,
        from: address,
        to: address,
    }

    /// 门票撤销事件
    public struct TicketRevoked has copy, drop {
        ticket_id: address,
        revoked_by: address,
        reason: String,
    }

    /// 门票标记已用事件
    public struct TicketUsed has copy, drop {
        ticket_id: address,
        used_by: address,
    }

    /// 初始化函数，创建 Display
    fun init(otw: TICKET_NFT, ctx: &mut TxContext) {
        let keys = vector[
            string::utf8(b"name"),
            string::utf8(b"description"),
            string::utf8(b"image_url"),
            string::utf8(b"project_url"),
            string::utf8(b"creator"),
        ];

        let values = vector[
            string::utf8(b"{name}"),
            string::utf8(b"{description}"),
            string::utf8(b"{url}"),
            string::utf8(b"https://attenda.io"),
            string::utf8(b"Attenda"),
        ];

        let publisher = package::claim(otw, ctx);
        let display = display::new_with_fields<Ticket>(
            &publisher, keys, values, ctx
        );

        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(display, tx_context::sender(ctx));
    }

    /// 铸造门票
    public entry fun mint_ticket(
        event: &mut EventInfo,
        policy: &mut TicketPolicy,
        to: address,
        walrus_blob_ref: vector<u8>,
        encrypted_meta_hash: vector<u8>,
        ticket_type: u8,
        name: vector<u8>,
        description: vector<u8>,
        url: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 检查活动是否激活
        assert!(event_registry::is_active(event), ERR_TICKET_INVALID);
        
        // 检查用户是否已经注册过此活动
        assert!(!event_registry::has_registered(event, to), ERR_ALREADY_REGISTERED);
        
        // 标记用户已注册
        event_registry::mark_registered(event, to);
        
        // 增加已售票数
        event_registry::increment_tickets_sold(event);

        let event_addr = sui::object::id_to_address(&sui::object::id(event));
        let now_ms = clock::timestamp_ms(clock);
        
        let ticket = Ticket {
            id: sui::object::new(ctx),
            event_id: event_addr,
            owner: to,
            walrus_blob_ref: string::utf8(walrus_blob_ref),
            encrypted_meta_hash,
            ticket_type,
            status: STATUS_VALID,
            created_at: now_ms,
            name: string::utf8(name),
            description: string::utf8(description),
            url: url::new_unsafe_from_bytes(url),
        };

        let ticket_id = sui::object::uid_to_address(&ticket.id);
        
        // 添加持票人到 Seal 访问策略（无需 PolicyCap）
        ticket_seal::add_ticket_holder_internal(policy, ticket_id, to, ctx);
        
        event::emit(TicketMinted {
            ticket_id,
            event_id: ticket.event_id,
            owner: to,
            ticket_type,
        });

        transfer::public_transfer(ticket, to);
    }

    /// 转移门票（可选限制转让）
    #[allow(lint(custom_state_change))]
    public entry fun transfer_ticket(
        ticket: Ticket,
        policy: &mut TicketPolicy,
        cap: &PolicyCap,
        to: address,
        ctx: &mut TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        assert!(ticket.owner == sender, ERR_NOT_OWNER);
        assert!(ticket.status == STATUS_VALID, ERR_TICKET_INVALID);

        let ticket_id = sui::object::uid_to_address(&ticket.id);
        let from = ticket.owner;
        
        // 更新 Seal 访问策略：移除旧持票人，添加新持票人
        ticket_seal::remove_ticket_holder(policy, cap, ticket_id);
        ticket_seal::add_ticket_holder(policy, cap, ticket_id, to, ctx);

        event::emit(TicketTransferred {
            ticket_id,
            from,
            to,
        });

        sui::transfer::public_transfer(ticket, to);
    }

    /// 撤销门票（管理员功能）
    public entry fun revoke_ticket(
        ticket: &mut Ticket,
        reason: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        assert!(ticket.status == STATUS_VALID, ERR_TICKET_INVALID);

        ticket.status = STATUS_REVOKED;

        let ticket_id = sui::object::uid_to_address(&ticket.id);
        event::emit(TicketRevoked {
            ticket_id,
            revoked_by: sender,
            reason: std::string::utf8(reason),
        });
    }

    /// 标记门票已用（门禁系统调用）
    public entry fun mark_used(
        ticket: &mut Ticket,
        ctx: &mut TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        assert!(ticket.status == STATUS_VALID, ERR_ALREADY_USED);

        ticket.status = STATUS_USED;

        let ticket_id = sui::object::uid_to_address(&ticket.id);
        event::emit(TicketUsed {
            ticket_id,
            used_by: sender,
        });
    }

    /// 只读访问器
    public fun get_owner(ticket: &Ticket): address {
        ticket.owner
    }

    public fun get_event_id(ticket: &Ticket): address {
        ticket.event_id
    }

    public fun get_status(ticket: &Ticket): u8 {
        ticket.status
    }

    public fun is_valid(ticket: &Ticket): bool {
        ticket.status == STATUS_VALID
    }
}
