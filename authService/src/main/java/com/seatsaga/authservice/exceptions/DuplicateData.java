package com.seatsaga.authservice.exceptions;

public class DuplicateData extends  RuntimeException {

    public DuplicateData(String msg){
        super(msg);
    }
}
