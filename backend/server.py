from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

class Wallet(BaseModel):
    user_id: str
    coins_balance: float = 0.0
    stars_balance: float = 0.0
    bonus_balance: float = 0.0
    withdrawable_balance: float = 0.0
    total_deposited: float = 0.0
    total_withdrawn: float = 0.0
    created_at: datetime
    updated_at: datetime

class TransactionType(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    VIP_SUBSCRIPTION = "vip_subscription"
    VIP_RENEWAL = "vip_renewal"
    BONUS = "bonus"
    GAME_BET = "game_bet"
    GAME_WIN = "game_win"
    TRANSFER = "transfer"

class TransactionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class WalletTransaction(BaseModel):
    transaction_id: str
    user_id: str
    transaction_type: TransactionType
    amount: float
    currency_type: str = "coins"
    status: TransactionStatus
    reference_id: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

class VIPLevel(BaseModel):
    level: int
    name: str
    recharge_requirement: float
    monthly_fee: float
    gaming_bonus: float = 0.0
    free_spins_daily: int = 0
    education_discount: float = 0.0
    priority_support: bool = False
    withdrawal_priority: bool = False
    exclusive_games: bool = False
    badge_color: str = "#808080"
    icon: str = "star"

class UserVIPStatus(BaseModel):
    user_id: str
    vip_level: int = 0
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    total_recharged: float = 0.0
    is_active: bool = False
    auto_renew: bool = True
    created_at: datetime
    updated_at: datetime

class Notification(BaseModel):
    notification_id: str
    user_id: str
    title: str
    message: str
    notification_type: str
    is_read: bool = False
    action_url: Optional[str] = None
    created_at: datetime

# ==================== VIP LEVELS DATA ====================

VIP_LEVELS_DATA = [
    {
        "level": 0,
        "name": "Basic",
        "recharge_requirement": 0,
        "monthly_fee": 0,
        "gaming_bonus": 0,
        "free_spins_daily": 0,
        "education_discount": 0,
        "priority_support": False,
        "withdrawal_priority": False,
        "exclusive_games": False,
        "badge_color": "#808080",
        "icon": "user"
    },
    {
        "level": 1,
        "name": "Bronze",
        "recharge_requirement": 500,
        "monthly_fee": 99,
        "gaming_bonus": 5,
        "free_spins_daily": 2,
        "education_discount": 5,
        "priority_support": False,
        "withdrawal_priority": False,
        "exclusive_games": False,
        "badge_color": "#CD7F32",
        "icon": "star"
    },
    {
        "level": 2,
        "name": "Silver",
        "recharge_requirement": 2000,
        "monthly_fee": 299,
        "gaming_bonus": 10,
        "free_spins_daily": 5,
        "education_discount": 10,
        "priority_support": True,
        "withdrawal_priority": False,
        "exclusive_games": False,
        "badge_color": "#C0C0C0",
        "icon": "star"
    },
    {
        "level": 3,
        "name": "Gold",
        "recharge_requirement": 5000,
        "monthly_fee": 599,
        "gaming_bonus": 15,
        "free_spins_daily": 10,
        "education_discount": 15,
        "priority_support": True,
        "withdrawal_priority": True,
        "exclusive_games": True,
        "badge_color": "#FFD700",
        "icon": "crown"
    },
    {
        "level": 4,
        "name": "Platinum",
        "recharge_requirement": 15000,
        "monthly_fee": 999,
        "gaming_bonus": 20,
        "free_spins_daily": 20,
        "education_discount": 20,
        "priority_support": True,
        "withdrawal_priority": True,
        "exclusive_games": True,
        "badge_color": "#E5E4E2",
        "icon": "crown"
    },
    {
        "level": 5,
        "name": "Diamond",
        "recharge_requirement": 50000,
        "monthly_fee": 1999,
        "gaming_bonus": 30,
        "free_spins_daily": 50,
        "education_discount": 30,
        "priority_support": True,
        "withdrawal_priority": True,
        "exclusive_games": True,
        "badge_color": "#B9F2FF",
        "icon": "diamond"
    }
]

# ==================== AUTH HELPERS ====================

async def get_session_token(request: Request) -> Optional[str]:
    """Get session token from cookie or Authorization header"""
    # Try cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        return session_token
    
    # Try Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    
    return None

async def get_current_user(request: Request) -> User:
    """Get current user from session token"""
    session_token = await get_session_token(request)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry (handle timezone-naive datetimes from MongoDB)
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

async def get_optional_user(request: Request) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Exchange session_id with Emergent Auth
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session_id")
            
            user_data = auth_response.json()
            session_data = SessionDataResponse(**user_data)
            
        except httpx.RequestError as e:
            logger.error(f"Auth request failed: {e}")
            raise HTTPException(status_code=500, detail="Auth service unavailable")
    
    # Generate our own user_id
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    # Check if user exists by email
    existing_user = await db.users.find_one({"email": session_data.email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        # Create new user
        await db.users.insert_one({
            "user_id": user_id,
            "email": session_data.email,
            "name": session_data.name,
            "picture": session_data.picture,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Create wallet for new user
        await db.wallets.insert_one({
            "user_id": user_id,
            "coins_balance": 1000.0,  # Welcome bonus
            "stars_balance": 0.0,
            "bonus_balance": 100.0,  # Bonus balance
            "withdrawable_balance": 0.0,
            "total_deposited": 0.0,
            "total_withdrawn": 0.0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
        
        # Create VIP status for new user
        await db.vip_status.insert_one({
            "user_id": user_id,
            "vip_level": 0,
            "subscription_start": None,
            "subscription_end": None,
            "total_recharged": 0.0,
            "is_active": False,
            "auto_renew": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
        
        # Add welcome notification
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "title": "Welcome to VIP Club! 🎉",
            "message": "You've received 1000 coins and 100 bonus as a welcome gift!",
            "notification_type": "welcome",
            "is_read": False,
            "action_url": "/wallet",
            "created_at": datetime.now(timezone.utc)
        })
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_data.session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_data.session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Get user data
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "success": True,
        "user": user_doc,
        "session_token": session_data.session_token
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = await get_session_token(request)
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    
    return {"success": True, "message": "Logged out successfully"}

@api_router.get("/auth/check")
async def check_auth(request: Request):
    """Check if user is authenticated"""
    user = await get_optional_user(request)
    return {"authenticated": user is not None, "user": user}

# ==================== WALLET ENDPOINTS ====================

@api_router.get("/wallet")
async def get_wallet(current_user: User = Depends(get_current_user)):
    """Get user's wallet"""
    wallet = await db.wallets.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    return wallet

@api_router.get("/wallet/transactions")
async def get_transactions(
    limit: int = 20,
    offset: int = 0,
    transaction_type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get user's wallet transactions"""
    query = {"user_id": current_user.user_id}
    if transaction_type:
        query["transaction_type"] = transaction_type
    
    transactions = await db.wallet_transactions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    total = await db.wallet_transactions.count_documents(query)
    
    return {
        "transactions": transactions,
        "total": total,
        "limit": limit,
        "offset": offset
    }

class DepositRequest(BaseModel):
    amount: float

@api_router.post("/wallet/deposit")
async def deposit(
    request: DepositRequest,
    current_user: User = Depends(get_current_user)
):
    """Deposit coins to wallet (mock - for MVP)"""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    if request.amount > 100000:
        raise HTTPException(status_code=400, detail="Maximum deposit is 100,000")
    
    # Update wallet
    wallet = await db.wallets.find_one_and_update(
        {"user_id": current_user.user_id},
        {
            "$inc": {
                "coins_balance": request.amount,
                "total_deposited": request.amount
            },
            "$set": {"updated_at": datetime.now(timezone.utc)}
        },
        return_document=True,
        projection={"_id": 0}
    )
    
    # Create transaction
    transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
    await db.wallet_transactions.insert_one({
        "transaction_id": transaction_id,
        "user_id": current_user.user_id,
        "transaction_type": TransactionType.DEPOSIT,
        "amount": request.amount,
        "currency_type": "coins",
        "status": TransactionStatus.COMPLETED,
        "description": f"Deposit of {request.amount} coins",
        "created_at": datetime.now(timezone.utc)
    })
    
    # Update VIP recharge total
    await db.vip_status.update_one(
        {"user_id": current_user.user_id},
        {
            "$inc": {"total_recharged": request.amount},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    # Check for VIP eligibility
    vip_status = await db.vip_status.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    
    # Find eligible VIP level
    eligible_level = 0
    for level_data in VIP_LEVELS_DATA:
        if vip_status["total_recharged"] >= level_data["recharge_requirement"]:
            eligible_level = level_data["level"]
    
    # Add notification
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": current_user.user_id,
        "title": "Deposit Successful! 💰",
        "message": f"Your deposit of {request.amount} coins has been credited.",
        "notification_type": "wallet",
        "is_read": False,
        "action_url": "/wallet",
        "created_at": datetime.now(timezone.utc)
    })
    
    return {
        "success": True,
        "wallet": wallet,
        "transaction_id": transaction_id,
        "eligible_vip_level": eligible_level
    }

class WithdrawRequest(BaseModel):
    amount: float

@api_router.post("/wallet/withdraw")
async def withdraw(
    request: WithdrawRequest,
    current_user: User = Depends(get_current_user)
):
    """Withdraw coins from wallet (mock - for MVP)"""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    wallet = await db.wallets.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if wallet["withdrawable_balance"] < request.amount:
        raise HTTPException(status_code=400, detail="Insufficient withdrawable balance")
    
    # Update wallet
    wallet = await db.wallets.find_one_and_update(
        {"user_id": current_user.user_id},
        {
            "$inc": {
                "withdrawable_balance": -request.amount,
                "total_withdrawn": request.amount
            },
            "$set": {"updated_at": datetime.now(timezone.utc)}
        },
        return_document=True,
        projection={"_id": 0}
    )
    
    # Create transaction
    transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
    await db.wallet_transactions.insert_one({
        "transaction_id": transaction_id,
        "user_id": current_user.user_id,
        "transaction_type": TransactionType.WITHDRAWAL,
        "amount": -request.amount,
        "currency_type": "coins",
        "status": TransactionStatus.PENDING,
        "description": f"Withdrawal of {request.amount} coins",
        "created_at": datetime.now(timezone.utc)
    })
    
    # Add notification
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": current_user.user_id,
        "title": "Withdrawal Requested 📤",
        "message": f"Your withdrawal of {request.amount} coins is being processed.",
        "notification_type": "wallet",
        "is_read": False,
        "action_url": "/wallet",
        "created_at": datetime.now(timezone.utc)
    })
    
    return {
        "success": True,
        "wallet": wallet,
        "transaction_id": transaction_id
    }

class TransferRequest(BaseModel):
    amount: float
    from_balance: str  # "coins", "bonus", "stars"
    to_balance: str

@api_router.post("/wallet/transfer")
async def transfer_balance(
    request: TransferRequest,
    current_user: User = Depends(get_current_user)
):
    """Transfer between wallet balances"""
    valid_balances = ["coins_balance", "bonus_balance", "stars_balance", "withdrawable_balance"]
    from_field = f"{request.from_balance}_balance"
    to_field = f"{request.to_balance}_balance"
    
    if from_field not in valid_balances or to_field not in valid_balances:
        raise HTTPException(status_code=400, detail="Invalid balance type")
    
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    wallet = await db.wallets.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if wallet[from_field] < request.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Update wallet
    wallet = await db.wallets.find_one_and_update(
        {"user_id": current_user.user_id},
        {
            "$inc": {
                from_field: -request.amount,
                to_field: request.amount
            },
            "$set": {"updated_at": datetime.now(timezone.utc)}
        },
        return_document=True,
        projection={"_id": 0}
    )
    
    return {"success": True, "wallet": wallet}

# ==================== VIP ENDPOINTS ====================

@api_router.get("/vip/levels")
async def get_vip_levels():
    """Get all VIP levels and their benefits"""
    return {"levels": VIP_LEVELS_DATA}

@api_router.get("/vip/status")
async def get_vip_status(current_user: User = Depends(get_current_user)):
    """Get user's VIP status"""
    vip_status = await db.vip_status.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not vip_status:
        raise HTTPException(status_code=404, detail="VIP status not found")
    
    # Get current level details
    current_level_data = next(
        (l for l in VIP_LEVELS_DATA if l["level"] == vip_status["vip_level"]),
        VIP_LEVELS_DATA[0]
    )
    
    # Find eligible level based on recharge
    eligible_level = 0
    for level_data in VIP_LEVELS_DATA:
        if vip_status["total_recharged"] >= level_data["recharge_requirement"]:
            eligible_level = level_data["level"]
    
    # Calculate days remaining
    days_remaining = None
    if vip_status["subscription_end"]:
        sub_end = vip_status["subscription_end"]
        if sub_end.tzinfo is None:
            sub_end = sub_end.replace(tzinfo=timezone.utc)
        remaining = sub_end - datetime.now(timezone.utc)
        days_remaining = max(0, remaining.days)
    
    return {
        **vip_status,
        "current_level_data": current_level_data,
        "eligible_level": eligible_level,
        "days_remaining": days_remaining
    }

class SubscribeVIPRequest(BaseModel):
    level: int

@api_router.post("/vip/subscribe")
async def subscribe_vip(
    request: SubscribeVIPRequest,
    current_user: User = Depends(get_current_user)
):
    """Subscribe to a VIP level"""
    # Get level details
    level_data = next(
        (l for l in VIP_LEVELS_DATA if l["level"] == request.level),
        None
    )
    
    if not level_data:
        raise HTTPException(status_code=400, detail="Invalid VIP level")
    
    # Get current VIP status
    vip_status = await db.vip_status.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    
    # Check recharge requirement
    if vip_status["total_recharged"] < level_data["recharge_requirement"]:
        raise HTTPException(
            status_code=400,
            detail=f"Need to recharge {level_data['recharge_requirement']} to unlock this level"
        )
    
    # Check wallet balance
    wallet = await db.wallets.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if wallet["coins_balance"] < level_data["monthly_fee"]:
        raise HTTPException(status_code=400, detail="Insufficient coins balance")
    
    # Deduct fee from wallet
    await db.wallets.update_one(
        {"user_id": current_user.user_id},
        {
            "$inc": {"coins_balance": -level_data["monthly_fee"]},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    # Update VIP status
    now = datetime.now(timezone.utc)
    subscription_end = now + timedelta(days=30)
    
    await db.vip_status.update_one(
        {"user_id": current_user.user_id},
        {
            "$set": {
                "vip_level": request.level,
                "subscription_start": now,
                "subscription_end": subscription_end,
                "is_active": True,
                "updated_at": now
            }
        }
    )
    
    # Create transaction
    transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
    await db.wallet_transactions.insert_one({
        "transaction_id": transaction_id,
        "user_id": current_user.user_id,
        "transaction_type": TransactionType.VIP_SUBSCRIPTION,
        "amount": -level_data["monthly_fee"],
        "currency_type": "coins",
        "status": TransactionStatus.COMPLETED,
        "description": f"VIP {level_data['name']} subscription",
        "created_at": now
    })
    
    # Add notification
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": current_user.user_id,
        "title": f"VIP {level_data['name']} Activated! 👑",
        "message": f"Enjoy your exclusive benefits for the next 30 days!",
        "notification_type": "vip",
        "is_read": False,
        "action_url": "/vip",
        "created_at": now
    })
    
    # Get updated status
    updated_status = await db.vip_status.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    
    return {
        "success": True,
        "vip_status": updated_status,
        "level_data": level_data,
        "transaction_id": transaction_id
    }

@api_router.post("/vip/toggle-auto-renew")
async def toggle_auto_renew(current_user: User = Depends(get_current_user)):
    """Toggle auto-renewal for VIP subscription"""
    vip_status = await db.vip_status.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    
    new_value = not vip_status["auto_renew"]
    
    await db.vip_status.update_one(
        {"user_id": current_user.user_id},
        {
            "$set": {
                "auto_renew": new_value,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {"success": True, "auto_renew": new_value}

@api_router.post("/vip/cancel")
async def cancel_vip(current_user: User = Depends(get_current_user)):
    """Cancel VIP subscription (will remain active until expiry)"""
    await db.vip_status.update_one(
        {"user_id": current_user.user_id},
        {
            "$set": {
                "auto_renew": False,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Add notification
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": current_user.user_id,
        "title": "VIP Subscription Cancelled",
        "message": "Your VIP benefits will remain active until the subscription period ends.",
        "notification_type": "vip",
        "is_read": False,
        "action_url": "/vip",
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"success": True, "message": "VIP subscription cancelled. Benefits remain active until expiry."}

# ==================== NOTIFICATION ENDPOINTS ====================

@api_router.get("/notifications")
async def get_notifications(
    limit: int = 20,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Get user notifications"""
    query = {"user_id": current_user.user_id}
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    unread_count = await db.notifications.count_documents({
        "user_id": current_user.user_id,
        "is_read": False
    })
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark notification as read"""
    await db.notifications.update_one(
        {
            "notification_id": notification_id,
            "user_id": current_user.user_id
        },
        {"$set": {"is_read": True}}
    )
    
    return {"success": True}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(current_user: User = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": current_user.user_id},
        {"$set": {"is_read": True}}
    )
    
    return {"success": True}

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "VIP Wallet API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
