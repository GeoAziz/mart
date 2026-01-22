"""Logging utilities"""
import logging
import os
from datetime import datetime
from typing import Optional


class Logger:
    """Centralized logging for tests"""
    
    _loggers = {}
    
    @classmethod
    def get_logger(cls, name: str, log_level: int = logging.INFO) -> logging.Logger:
        """Get or create a logger instance"""
        if name in cls._loggers:
            return cls._loggers[name]
        
        logger = logging.getLogger(name)
        logger.setLevel(log_level)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        
        # Formatter
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        console_handler.setFormatter(formatter)
        
        logger.addHandler(console_handler)
        cls._loggers[name] = logger
        
        return logger
    
    @classmethod
    def log_step(cls, logger: logging.Logger, step_num: int, message: str):
        """Log a test step"""
        logger.info(f"[STEP {step_num}] {message}")
    
    @classmethod
    def log_success(cls, logger: logging.Logger, message: str):
        """Log success"""
        logger.info(f"✅ {message}")
    
    @classmethod
    def log_error(cls, logger: logging.Logger, message: str):
        """Log error"""
        logger.error(f"❌ {message}")
    
    @classmethod
    def log_warning(cls, logger: logging.Logger, message: str):
        """Log warning"""
        logger.warning(f"⚠️ {message}")
    
    @classmethod
    def log_info(cls, logger: logging.Logger, message: str):
        """Log info"""
        logger.info(f"ℹ️ {message}")


def get_logger(name: str) -> logging.Logger:
    """Convenience function to get logger"""
    return Logger.get_logger(name)
